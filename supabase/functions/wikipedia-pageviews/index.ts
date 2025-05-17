import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Enhanced retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 10000; // 10 seconds
const JITTER_MAX = 1000; // Maximum jitter in milliseconds
const REQUEST_TIMEOUT = 10000; // 10 second timeout

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Accept, X-Requested-With',
  'Access-Control-Max-Age': '86400'
};

// Add jitter to retry delay
function getRetryDelay(attempt: number): number {
  const baseDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  return baseDelay + (Math.random() * JITTER_MAX);
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  // Add User-Agent to headers
  const finalOptions = {
    ...options,
    headers: {
      ...options.headers,
      'User-Agent': USER_AGENT,
      'Api-User-Agent': USER_AGENT
    }
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, { 
        ...finalOptions,
        signal: timeoutController.signal
      });

      clearTimeout(timeoutId);
      
      // Return 404 responses immediately
      if (response.ok || response.status === 404) {
        return response;
      }

      // Retry on server errors and rate limits
      const shouldRetry = [429, 500, 502, 503, 504].includes(response.status);
      if (!shouldRetry) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle rate limits with Retry-After header
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const delay = parseInt(retryAfter) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Add status code to error for better handling
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      clearTimeout(timeoutId);

      // Don't retry on AbortError (timeout) or non-retryable errors
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // Include original error message
  throw lastError || new Error('Maximum retry attempts exceeded');
}

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: any; timestamp: number }>();

const USER_AGENT = 'CelebrityBrandsBot/1.0 (https://celebritybrands.com; contact@celebritybrands.com)';

async function fetchPageViews(article: string): Promise<any> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  // Format dates as YYYYMMDD
  const startStr = startDate.toISOString().slice(0,10).replace(/-/g,'');
  const endStr = now.toISOString().slice(0,10).replace(/-/g,'');
  
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${startStr}/${endStr}`;

  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Api-User-Agent': USER_AGENT
    }
  });

  if (response.status === 404) {
    return { error: `Wikipedia article "${article}" not found` };
  }

  return await response.json();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query');

    if (!query) {
      return new Response(JSON.stringify({
        error: 'Query parameter is required',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check cache
    const cacheKey = query.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Convert query to Wikipedia article title format
    const articleTitle = query
      .trim()
      // Replace spaces with underscores
      .replace(/\s+/g, '_')
      // Keep alphanumeric, spaces, hyphens, and some punctuation
      .replace(/[^\w\s\-'.]/g, '')
      // Capitalize first letter of each word
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');

    const data = await fetchPageViews(articleTitle);

    if (data.error) {
      return new Response(JSON.stringify({
        error: data.error,
        articleTitle,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Transform the data
    const items = data.items || [];
    if (items.length === 0) {
      throw new Error(`No page view data available for "${articleTitle}"`);
    }

    const interest = items.map((item: any) => ({
      timestamp: item.timestamp.slice(0, 8), // YYYYMMDD format
      value: item.views
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
      minInterest,
      articleTitle,
      source: 'Wikipedia Page Views'
    };

    // Cache the result
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Vary': 'Origin'
      }
    });
  } catch (error) {
    console.error('Error in wikipedia-pageviews function:', error);
    
    let statusCode = 500;
    let errorMessage = 'Failed to fetch page views';
    
    if (error.message?.includes('404')) {
      statusCode = 404;
      errorMessage = `Article not found`;
    } else if (error.message?.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timed out';
    } else if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message?.includes('Maximum retry attempts')) {
      statusCode = 503;
      errorMessage = 'Service temporarily unavailable. Please try again later.';
    }
    
    return new Response(JSON.stringify({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(statusCode === 429 ? { 'Retry-After': '300' } : {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
});