import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const NEWS_API_URL = 'https://api.thenewsapi.com/v1/news/all';
const NEWS_API_KEY = Deno.env.get('NEWS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 100; // Maximum requests per window
const requestLog = new Map<string, number[]>();

function isRateLimited(): boolean {
  const now = Date.now();
  const requests = requestLog.get('global') || [];
  const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestLog.set('global', recentRequests);
  return recentRequests.length >= MAX_REQUESTS;
}

function logRequest() {
  const requests = requestLog.get('global') || [];
  requests.push(Date.now());
  requestLog.set('global', requests);
}

async function fetchNewsCount(brandName: string): Promise<number> {
  const cleanBrandName = `"${brandName.replace(/[^\w\s]/gi, '').trim()}"`;
  const response = await fetch(
    `${NEWS_API_URL}?api_token=${NEWS_API_KEY}&search=${encodeURIComponent(cleanBrandName)}&language=en&published_after=${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
  );

  if (!response.ok) {
    throw new Error(`News API error: ${response.status}`);
  }

  const data = await response.json();
  return data.meta?.found || 0;
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !NEWS_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Check rate limit
    if (isRateLimited()) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again in an hour.',
          timestamp: new Date().toISOString()
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          }
        }
      );
    }

    // Log the request
    logRequest();

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch all brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('approval_status', 'approved');

    if (brandsError) throw brandsError;

    console.log(`Processing ${brands?.length || 0} brands`);

    // Process brands in batches to avoid overwhelming the News API
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    for (let i = 0; i < (brands?.length || 0); i += BATCH_SIZE) {
      const batch = brands!.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (brand) => {
        try {
          const newsCount = await fetchNewsCount(brand.name);
          
          // Insert metric
          const { error: metricError } = await supabase
            .from('brand_metrics')
            .insert({
              brand_id: brand.id,
              metric_type: 'news_mentions',
              metric_value: newsCount,
              collected_at: new Date().toISOString()
            });

          if (metricError) {
            console.error(`Error inserting metric for brand ${brand.name}:`, metricError);
          }
        } catch (error) {
          console.error(`Error processing brand ${brand.name}:`, error);
        }
      }));

      // Wait before processing next batch
      if (i + BATCH_SIZE < (brands?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: brands?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in news-counts function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch news counts',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});