import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const USER_AGENT = 'CelebrityBrandsBot/1.0';

async function fetchPageViews(article: string): Promise<any> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  
  const startStr = startDate.toISOString().slice(0,10).replace(/-/g,'');
  const endStr = now.toISOString().slice(0,10).replace(/-/g,'');
  
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${startStr}/${endStr}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { error: `Wikipedia article "${article}" not found` };
    }
    throw new Error(`Wikipedia API error: ${response.status}`);
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all approved brands
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('approval_status', 'approved');

    if (brandsError) throw brandsError;

    console.log(`Processing ${brands?.length || 0} brands`);

    // Process brands in batches to avoid overwhelming the Wikipedia API
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

    for (let i = 0; i < (brands?.length || 0); i += BATCH_SIZE) {
      const batch = brands!.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (brand) => {
        try {
          // Convert brand name to Wikipedia article format
          const articleTitle = brand.name
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^\w\s\-'.]/g, '')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('_');

          const data = await fetchPageViews(articleTitle);

          if (!data.error) {
            // Calculate average views
            const views = data.items.map((item: any) => item.views);
            const averageViews = views.reduce((a: number, b: number) => a + b, 0) / views.length;

            // Insert metric
            const { error: metricError } = await supabase
              .from('brand_metrics')
              .insert({
                brand_id: brand.id,
                metric_type: 'search_interest',
                metric_value: averageViews,
                collected_at: new Date().toISOString()
              });

            if (metricError) {
              console.error(`Error inserting metric for brand ${brand.name}:`, metricError);
            }
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
    console.error('Error in fetch-pageviews function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch pageviews',
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