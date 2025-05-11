import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Add jitter to retry delay
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  return delay + (Math.random() * 1000); // Add up to 1 second of jitter
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Only retry on specific error codes
      if (response.ok || response.status === 404) {
        return response;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
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
      throw new Error('Query parameter is required');
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
    const interest = (data.items || []).map((item: any) => ({
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
        'Cache-Control': `public, max-age=${CACHE_TTL / 1000}`
      }
    });
  } catch (error) {
    console.error('Error in wikipedia-pageviews function:', error);
    const statusCode = error.message?.includes('404') ? 404 : 500;
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to fetch page views',
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});