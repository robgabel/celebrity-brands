import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { default as googleTrends } from 'npm:google-trends-api@4.9.2';

// Cache and rate limiting configuration
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const cache = new Map<string, { data: string; timestamp: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_REQUESTS = 10; // Maximum requests per window
const requestLog = new Map<string, number[]>();

// Exponential backoff configuration
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds
const MAX_RETRIES = 3;
const JITTER_MAX = 1000; // Maximum jitter in milliseconds
const REQUEST_TIMEOUT = 20000; // 20 second timeout

function addJitter(delay: number): number {
  return delay + Math.random() * JITTER_MAX;
}

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const requests = requestLog.get(clientId) || [];
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestLog.set(clientId, recentRequests);
  
  return recentRequests.length >= MAX_REQUESTS;
}

function logRequest(clientId: string) {
  const requests = requestLog.get(clientId) || [];
  requests.push(Date.now());
  requestLog.set(clientId, requests);
}

async function fetchWithRetry(query: string, retryCount = 0): Promise<string> {
  try {
    console.log(`Attempt ${retryCount + 1}/${MAX_RETRIES} for query: "${query}"`);

    // Wrap the API call in a Promise.race with a timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), REQUEST_TIMEOUT);
    });

    // Clean and format the query
    const cleanQuery = query.trim().replace(/^["']|["']$/g, '');

    const apiPromise = googleTrends.interestOverTime({
      keyword: cleanQuery,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
      geo: 'US',
      timezone: 0,
      granularTimeResolution: false
    });

    const result = await Promise.race([apiPromise, timeoutPromise]) as string;

    // Validate the response format
    try {
      const parsed = JSON.parse(result);
      if (!parsed?.default?.timelineData) {
        throw new Error('Invalid response format from Google Trends API');
      }
    } catch (parseError) {
      throw new Error('Invalid response format from Google Trends API');
    }

    return result;
  } catch (error) {
    console.error(`Attempt ${retryCount + 1} failed for "${query}":`, error);

    // Check for specific error conditions that warrant a retry
    const shouldRetry = (
      retryCount < MAX_RETRIES &&
      (error.message?.includes('stringify') ||
       error.message?.includes('quota') ||
       error.message?.includes('timeout') ||
       error.message?.includes('ETIMEDOUT') ||
       error.message?.includes('temporarily unavailable') ||
       error.message?.includes('<!DOCTYPE html>') ||
       error.message?.includes('<html') ||
       error.message?.includes('ECONNRESET') ||
       error.message?.includes('socket hang up'))
    );

    if (shouldRetry) {
      const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      const delay = addJitter(baseDelay);
      console.log(`Retrying "${query}" in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(query, retryCount + 1);
    }

    // If we've exhausted retries or encountered a non-retryable error
    if (retryCount >= MAX_RETRIES) {
      throw new Error(`Failed to fetch data after ${MAX_RETRIES} attempts. Please try again later.`);
    }

    throw error;
  }
}

async function fetchTrendsData(query: string): Promise<string> {
  try {
    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL * 1000) {
      console.log('Returning cached data for:', query);
      return cached.data;
    }

    console.log('Cache miss, fetching fresh data for:', query);
    const result = await fetchWithRetry(query);

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error in fetchTrendsData:', error);
    
    let errorMessage: string;
    let statusCode: number;
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'API rate limit exceeded. Please try again in 60 seconds.';
      statusCode = 429;
    } else if (error.message?.includes('stringify')) {
      errorMessage = 'Unable to process trend data. Please try again.';
      statusCode = 500;
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      errorMessage = 'Request timed out. Please try again.';
      statusCode = 504;
    } else if (error.message?.includes('Invalid response format')) {
      errorMessage = 'Unable to retrieve trend data. Please try again later.';
      statusCode = 503;
    } else if (error.message?.includes('attempts')) {
      errorMessage = error.message;
      statusCode = 503;
    } else {
      errorMessage = 'Service temporarily unavailable. Please try again in a few minutes.';
      statusCode = 503;
    }
    
    const err = new Error(errorMessage);
    (err as any).statusCode = statusCode;
    throw err;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (!query) {
      return new Response(
        JSON.stringify({
          error: 'Query parameter is required',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Check rate limit
    if (isRateLimited(clientId)) {
      console.log(`Rate limit exceeded for client ${clientId} (${userAgent})`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before making another request.',
          timestamp: new Date().toISOString(),
          retryAfter: 60
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    // Log the request
    logRequest(clientId);

    console.log(`Processing request for "${query}" from ${clientId} (${userAgent})`);

    const result = await fetchTrendsData(query);
    const parsedData = JSON.parse(result);

    // Transform the data
    const interest = parsedData.default.timelineData.map((point: any) => ({
      timestamp: point.formattedTime,
      value: point.value[0] || 0
    }));

    // Calculate statistics
    const values = interest.map((point: any) => point.value);
    const averageInterest = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const maxInterest = Math.max(...values);
    const minInterest = Math.min(...values);

    const response = {
      interest,
      averageInterest,
      maxInterest,
      minInterest
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    });
  } catch (error) {
    console.error('Error in trends function:', error);
    
    const statusCode = (error as any).statusCode || 503;
    const errorResponse = {
      error: error.message || 'Failed to fetch trend data',
      timestamp: new Date().toISOString(),
      retryAfter: statusCode === 429 ? 60 : undefined
    };
    
    return new Response(JSON.stringify(errorResponse), { 
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(statusCode === 429 ? { 'Retry-After': '60' } : {})
      },
    });
  }
});