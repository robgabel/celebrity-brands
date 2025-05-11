import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { default as googleTrends } from 'npm:google-trends-api@4.9.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Cache configuration
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const cache = new Map<string, { data: string; timestamp: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS = 10; // Maximum requests per window
const requestLog = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const requests = requestLog.get(clientId) || [];
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestLog.set(clientId, recentRequests);
  return recentRequests.length >= MAX_REQUESTS;
}

function logRequest(clientId: string) {
  const requests = requestLog.get(clientId) || [];
  requests.push(Date.now());
  requestLog.set(clientId, requests);
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

    console.log('Fetching fresh data for:', query);

    // Clean and format the query
    const cleanQuery = query.trim().replace(/^["']|["']$/g, '');

    const result = await googleTrends.interestOverTime({
      keyword: cleanQuery,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
      geo: 'US'
    });

    // Validate the response format
    const parsed = JSON.parse(result);
    if (!parsed?.default?.timelineData) {
      throw new Error('Invalid response format from Google Trends API');
    }

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Error in fetchTrendsData:', error);
    throw error;
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
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again in a few minutes.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '300'
          }
        }
      );
    }

    // Log the request
    logRequest(clientId);

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
        'Cache-Control': `public, max-age=${CACHE_TTL}`
      }
    });
  } catch (error) {
    console.error('Error in trends function:', error);
    
    const statusCode = error.message?.includes('rate limit') ? 429 : 503;
    const errorResponse = {
      error: error.message || 'Failed to fetch trend data',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});