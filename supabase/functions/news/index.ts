import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS = 10; // Maximum requests per window
const requestLog = new Map<string, number[]>();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

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

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry on 4xx errors (except 429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

const NEWS_API_URL = 'https://api.thenewsapi.com/v1/news/all';
const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');

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
    const brandName = url.searchParams.get('brand');
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';

    if (!brandName) {
      throw new Error('Brand name parameter is required');
    }

    if (!NEWS_API_KEY) {
      throw new Error('News API key not configured');
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

    // Remove special characters and add quotes for exact match
    const cleanBrandName = `"${brandName.replace(/[^\w\s]/gi, '').trim()}"`;

    const response = await fetchWithRetry(
      `${NEWS_API_URL}?api_token=${NEWS_API_KEY}&search=${encodeURIComponent(cleanBrandName)}&language=en&limit=5&sort=published_at&categories=business,entertainment&published_after=${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CelebrityBrands/1.0'
        }
      }
    );

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid response format from news API');
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from news API');
    }

    // Transform and validate the response
    const articles = data.data.map((article: any) => ({
      title: article.title || 'Untitled',
      url: article.url,
      description: article.description || article.snippet || '',
      image_url: article.image_url,
      published_at: article.published_at,
      source: article.source
    })).filter((article: any) => 
      article.url && 
      article.title && 
      article.published_at
    );

    return new Response(
      JSON.stringify(articles),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    console.error('Error in news function:', error);
    
    const statusCode = error.message?.includes('rate limit') ? 429 : 503;
    const errorResponse = {
      error: error.message || 'Failed to fetch news',
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(statusCode === 429 ? { 'Retry-After': '300' } : {})
        }
      }
    );
  }
});