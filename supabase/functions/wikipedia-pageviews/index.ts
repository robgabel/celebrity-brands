import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: any; timestamp: number }>();

const USER_AGENT = 'CelebrityBrandsApp/1.0 (https://celebritybrands.com; contact@celebritybrands.com)';

async function fetchPageViews(article: string): Promise<any> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${startDate.toISOString().split('T')[0]}/${now.toISOString().split('T')[0]}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { error: 'Article not found' };
    }
    throw new Error(`HTTP error! status: ${response.status}`);
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
      .replace(/\s+/g, '_')
      .replace(/[^\w\s-]/g, '')
      .replace(/_+/g, '_');

    const data = await fetchPageViews(articleTitle);

    if (data.error) {
      return new Response(JSON.stringify({
        error: data.error,
        articleTitle
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Transform the data
    const interest = data.items.map((item: any) => ({
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
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to fetch page views',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});