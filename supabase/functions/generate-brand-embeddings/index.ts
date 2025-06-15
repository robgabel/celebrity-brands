import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Always return proper CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders },
      status: 204
    });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      throw new Error('Missing required environment variables');
    }

    // Validate request body
    const body = await req.json().catch(() => null);
    if (!body || !body.brandId) {
      return new Response(
        JSON.stringify({ 
          error: 'Brand ID is required' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const { brandId } = body;

    // Initialize Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch brand details
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('name, creators, description, product_category, type_of_influencer')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Database fetch error:', brandError);
      throw new Error('Failed to fetch brand details');
    }

    if (!brand) {
      return new Response(
        JSON.stringify({ 
          error: 'Brand not found' 
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Create the text to embed
    const textToEmbed = `Brand: ${brand.name}
Creators: ${brand.creators}
Category: ${brand.product_category || 'Unknown'}
Creator Type: ${brand.type_of_influencer || 'Unknown'}
Description: ${brand.description}`;

    // Generate embedding using OpenAI API directly
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: textToEmbed,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${embeddingResponse.status} ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();

    if (!embeddingData.data?.[0]?.embedding) {
      throw new Error('No embedding generated');
    }

    // Update the brand with the embedding
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        embedding: embeddingData.data[0].embedding,
        last_embedded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to store brand embedding');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embedding generated and stored successfully',
        brandId: brandId,
        embeddingLength: embeddingData.data[0].embedding.length
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Generate embedding error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        success: false,
      }), {
        status: error.status || 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});