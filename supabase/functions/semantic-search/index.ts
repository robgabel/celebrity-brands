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
    console.log('🚀 Semantic search function started');

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('🔧 Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      openAiKey: !!openAiKey
    });

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log('📥 Request body received:', body);
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    if (!body || !body.query) {
      console.error('❌ No query provided in request');
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
    console.log('🔍 Search query:', query);

    // Generate embedding for search query using OpenAI API directly
    console.log('🤖 Calling OpenAI API for embedding...');
    
    let embeddingResponse;
    try {
      embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
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
      console.log('🤖 OpenAI response status:', embeddingResponse.status);
    } catch (e) {
      console.error('❌ OpenAI fetch error:', e);
      throw new Error(`OpenAI API request failed: ${e.message}`);
    }

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('❌ OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${embeddingResponse.status} ${embeddingResponse.statusText}`);
    }

    let embeddingData;
    try {
      embeddingData = await embeddingResponse.json();
      console.log('🤖 OpenAI embedding received, length:', embeddingData.data?.[0]?.embedding?.length);
      console.log('🤖 First 5 embedding values:', embeddingData.data?.[0]?.embedding?.slice(0, 5));
    } catch (e) {
      console.error('❌ Failed to parse OpenAI response:', e);
      throw new Error('Failed to parse OpenAI response');
    }

    if (!embeddingData.data?.[0]?.embedding) {
      console.error('❌ No embedding in OpenAI response');
      throw new Error('Failed to generate query embedding');
    }

    // Initialize Supabase client
    console.log('🗄️ Initializing Supabase client...');
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
    console.log('🔍 Calling match_brands RPC function...');
    console.log('🔍 Parameters:', {
      embedding_length: embeddingData.data[0].embedding.length,
      match_threshold: 0.5,
      match_count: 10
    });

    let matches, searchError;
    try {
      const result = await supabaseClient.rpc(
        'match_brands',
        {
          query_embedding: embeddingData.data[0].embedding,
          match_threshold: 0.5,
          match_count: 10
        }
      );
      matches = result.data;
      searchError = result.error;
      
      console.log('🔍 RPC call completed');
      console.log('🔍 Error:', searchError);
      console.log('🔍 Matches count:', matches?.length);
      console.log('🔍 First match:', matches?.[0]);
    } catch (e) {
      console.error('❌ RPC call failed:', e);
      throw new Error(`Database search failed: ${e.message}`);
    }

    if (searchError) {
      console.error('❌ Database search error:', searchError);
      throw new Error(`Database search error: ${searchError.message}`);
    }

    if (!matches) {
      console.log('⚠️ No matches returned from RPC call');
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

    console.log('✅ Semantic search completed successfully');
    console.log('✅ Returning', matches.length, 'results');
    console.log('🔍 All matches:', JSON.stringify(matches, null, 2));
    
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
    console.error('💥 Semantic search function error:', error);

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