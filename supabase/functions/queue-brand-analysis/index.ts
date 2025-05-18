import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Required environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First check if brand exists
    const { data: existingBrand, error: checkError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw checkError;
    }

    if (existingBrand) {
      // Brand exists, just queue it for analysis
      const { data, error } = await supabase
        .from('brand_analysis_queue')
        .insert([
          { brand_id: brandId }
        ])
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Brand queued for analysis' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Brand doesn't exist, create analysis queue entry
    const { data, error } = await supabase
      .from('brand_analysis_queue')
      .insert([
        { brand_id: brandId }
      ])
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Brand queued for analysis' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in queue-brand-analysis function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to queue brand for analysis',
        timestamp: new Date().toISOString()
      }),
      {
        status: error.message?.includes('required') ? 400 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});