import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

    if (!brandName) {
      throw new Error('Brand name parameter is required');
    }

    if (!NEWS_API_KEY) {
      throw new Error('News API key not configured');
    }

    // Remove special characters and add quotes for exact match
    const cleanBrandName = `"${brandName.replace(/[^\w\s]/gi, '').trim()}"`;

    const response = await fetch(`${NEWS_API_URL}?api_token=${NEWS_API_KEY}&search=${encodeURIComponent(cleanBrandName)}&language=en&limit=5&sort=published_at&categories=business,entertainment&published_after=${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.data) {
      throw new Error('Invalid response format from news API');
    }

    // Transform the response
    const articles = data.data.map((article: any) => ({
      title: article.title,
      url: article.url,
      description: article.description || article.snippet,
      image_url: article.image_url,
      published_at: article.published_at,
      source: article.source
    }));

    return new Response(JSON.stringify(articles), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });
  } catch (error) {
    console.error('Error in news function:', error);
    
    const statusCode = error.message?.includes('rate limit') ? 429 : 503;
    const errorResponse = {
      error: error.message || 'Failed to fetch news',
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