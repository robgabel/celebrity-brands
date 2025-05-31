import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { Configuration, OpenAIApi } from 'npm:openai@4.28.0';

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
    if (!body || !body.query) {
      return new Response(
        JSON.stringify({ 
          error: 'Search query is required' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const { query } = body;

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: openAiKey,
    });
    const openai = new OpenAIApi(configuration);

    // Generate embedding for search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    });

    if (!embeddingResponse.data?.[0]?.embedding) {
      throw new Error('Failed to generate query embedding');
    }

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

    // Perform similarity search
    const { data: matches, error: searchError } = await supabaseClient.rpc(
      'match_brands',
      {
        query_embedding: embeddingResponse.data[0].embedding,
        match_threshold: 0.5,
        match_count: 10
      }
    );

    if (searchError) {
      console.error('Database search error:', searchError);
      throw new Error('Failed to search database');
    }

    if (!matches) {
      return new Response(
        JSON.stringify({ 
          results: [] 
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        results: matches,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Semantic search error:', error);

    // Return a structured error response
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