import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { Configuration, OpenAIApi } from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
      throw brandError;
    }

    if (!brand) {
      throw new Error('Brand not found');
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Create the text to embed
    const textToEmbed = `Brand: ${brand.name}
Creators: ${brand.creators}
Category: ${brand.product_category || 'Unknown'}
Creator Type: ${brand.type_of_influencer || 'Unknown'}
Description: ${brand.description}`;

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
      encoding_format: 'float',
    });

    if (!embeddingResponse.data[0]?.embedding) {
      throw new Error('No embedding generated');
    }

    // Update the brand with the embedding
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        embedding: embeddingResponse.data[0].embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Embedding generated and stored successfully',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});