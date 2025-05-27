import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import wiki from 'npm:wikijs@6.4.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get brand details
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('name, creators')
      .eq('id', brandId)
      .single();

    if (brandError) throw brandError;
    if (!brand) throw new Error('Brand not found');

    // Search Wikipedia for the brand
    const wikiClient = wiki({ apiUrl: 'https://en.wikipedia.org/w/api.php' });
    const searchResults = await wikiClient.search(`${brand.name} ${brand.creators}`, 2);

    let wikipediaUrl = null;
    if (searchResults.length > 0) {
      // Get the first result's full page
      try {
        const page = await wikiClient.page(searchResults[0]);
        wikipediaUrl = await page.url();
      } catch (pageError) {
        console.error('Error getting page:', pageError);
        // Try next result if first fails
        if (searchResults.length > 1) {
          try {
            const page = await wikiClient.page(searchResults[1]);
            wikipediaUrl = await page.url();
          } catch (fallbackError) {
            console.error('Error getting fallback page:', fallbackError);
          }
        }
      }
    }

    // Update the brand with Wikipedia URL
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({ 
        wikipedia_url: wikipediaUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        wikipedia_url: wikipediaUrl
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});