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
    console.log('Semantic search function started.'); // Log start

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    console.log(`Env vars check: Supabase URL present: ${!!supabaseUrl}, Supabase Key present: ${!!supabaseKey}, OpenAI Key present: ${!!openAiKey}`); // Log env var status

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      throw new Error('Missing required environment variables');
    }

    const body = await req.json().catch(() => null);
    console.log('Request body received:', body); // Log request body

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
    console.log('Query received:', query); // Log the query

    // Generate embedding for search query using OpenAI API directly
    console.log('Calling OpenAI API for embedding...'); // Log before OpenAI call
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error response:', errorText); // Log OpenAI error response
      throw new Error(`OpenAI API error: ${embeddingResponse.status} ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    console.log('OpenAI embedding data received (first 5 values):', embeddingData.data?.[0]?.embedding?.slice(0, 5)); // Log part of embedding
    console.log('Embedding length:', embeddingData.data?.[0]?.embedding?.length); // Log embedding length

    if (!embeddingData.data?.[0]?.embedding) {
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
    console.log('Calling Supabase RPC match_brands with threshold 0.5 and count 10...'); // Log before Supabase RPC call
    const { data: matches, error: searchError } = await supabaseClient.rpc(
      'match_brands',
      {
        query_embedding: embeddingData.data[0].embedding,
        match_threshold: 0.5,
        match_count: 10
      }
    );

    console.log('RPC call completed. Error:', searchError, 'Matches count:', matches?.length); // Log RPC results

    if (searchError) {
      console.error('Database search error:', searchError);
      throw new Error('Failed to search database');
    }

    if (!matches) {
      console.log('No matches returned from RPC call');
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

    console.log('Semantic search function finished successfully with', matches.length, 'results'); // Log success
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
    console.error('Semantic search function caught error:', error); // Log caught errors

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