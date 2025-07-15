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

    // TEMPORARY: Test with known working embedding for "happi"
    if (query.toLowerCase() === 'happi') {
      console.log('🧪 Using known working embedding for HAPPI test');
      const knownWorkingEmbedding = [0.00513391,0.01769116,0.00325504,-0.01243236,-0.03924236,-0.00324323,-0.00839127,-0.04062987,0.01025434,0.01234099,0.02410077,-0.00361808,0.00931082,0.02766289,0.02840412,0.02396056,0.01508343,0.00825995,0.00803127,-0.00985084,0.00655,-0.01804845,-0.01997213,0.00182479,0.01997135,0.00324928,0.00370006,0.00995625,-0.00007312,0.01794511,0.01315328,0.04125587,-0.03012215,-0.01542623,-0.01945047,-0.01547095,-0.02512911,0.04006350,-0.00651702,-0.01948450,0.02316171,0.00288217,-0.03410167,0.00151284,-0.01821339,0.00706104,0.01492693,-0.03454880,0.04501182,-0.01322036,-0.03219446,-0.00227853,-0.02384732,-0.00670203,-0.01159462,-0.01954461,-0.00288403,0.00750818,0.01321290,-0.01484495,-0.00007354,-0.02025014,-0.01461393,-0.00063761,0.01918219,0.02338528,0.00194318,-0.02526325,-0.04891682,-0.00819006];
      
      // Skip OpenAI API call and use known embedding
      const embeddingData = {
        data: [{
          embedding: knownWorkingEmbedding
        }]
      };
      
      console.log('🧪 Using known embedding, length:', knownWorkingEmbedding.length);
      console.log('🧪 First 5 values:', knownWorkingEmbedding.slice(0, 5));
      
      // Test the exact SQL query that worked
      console.log('🧪 Testing direct SQL query first...');
      try {
        const directSqlResult = await supabaseClient
          .from('brands')
          .select('id, name, creators, product_category, description')
          .eq('approval_status', 'approved')
          .limit(5);
        
        console.log('🧪 Direct SQL query result:', {
          error: directSqlResult.error,
          count: directSqlResult.data?.length,
          firstBrand: directSqlResult.data?.[0]
        });
      } catch (e) {
        console.error('🧪 Direct SQL query failed:', e);
      }
      
      // Jump to similarity search
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

      // Perform similarity search with known embedding
      console.log('🔍 Calling match_brands RPC function with known embedding...');
      
      // First, let's check if the function exists
      console.log('🔍 Checking if match_brands function exists...');
      try {
        const functionCheck = await supabaseClient
          .rpc('match_brands', {
            query_embedding: [0.1, 0.2, 0.3], // dummy small vector
            match_threshold: 0.0,
            match_count: 1
          });
        console.log('🔍 Function exists check result:', {
          error: functionCheck.error?.message,
          errorCode: functionCheck.error?.code,
          hasData: !!functionCheck.data
        });
      } catch (e) {
        console.error('🔍 Function check failed:', e);
      }
      
      let matches, searchError;
      try {
        console.log('🔍 About to call match_brands with parameters:');
        console.log('🔍 - query_embedding length:', knownWorkingEmbedding.length);
        console.log('🔍 - match_threshold:', 0.0);
        console.log('🔍 - match_count:', 10);
        
        const result = await supabaseClient.rpc(
          'match_brands',
          {
            query_embedding: knownWorkingEmbedding,
            match_threshold: 0.0,
            match_count: 10
          }
        );
        
        matches = result.data;
        searchError = result.error;
        
        console.log('🔍 RPC call completed with known embedding:');
        console.log('🔍 - Error:', searchError);
        console.log('🔍 - Error code:', searchError?.code);
        console.log('🔍 - Error message:', searchError?.message);
        console.log('🔍 - Error details:', searchError?.details);
        console.log('🔍 - Matches count:', matches?.length);
        console.log('🔍 - Matches type:', typeof matches);
        console.log('🔍 - First match:', matches?.[0]);
        console.log('🔍 - Raw result object keys:', Object.keys(result));
      } catch (e) {
        console.error('❌ RPC call failed with exception:', e);
        console.error('❌ Exception type:', typeof e);
        console.error('❌ Exception message:', e.message);
        console.error('❌ Exception stack:', e.stack);
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

      console.log('✅ Semantic search completed successfully with known embedding');
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
    }

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
      match_threshold: 0.0,
      match_count: 10
    });

    // Add detailed logging for the embedding vector
    console.log('🔍 Sending query_embedding to match_brands RPC:');
    console.log('🔍 First 5 values of query_embedding:', embeddingData.data[0].embedding.slice(0, 5));
    console.log('🔍 Last 5 values of query_embedding:', embeddingData.data[0].embedding.slice(-5));
    console.log('🔍 Full query_embedding length:', embeddingData.data[0].embedding.length);
    // console.log('🔍 Full query_embedding (CAUTION: very long):', embeddingData.data[0].embedding); // Uncomment for full vector if needed

    let matches, searchError;
    try {
      const result = await supabaseClient.rpc(
        'match_brands',
        {
          query_embedding: embeddingData.data[0].embedding,
          match_threshold: 0.0,
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