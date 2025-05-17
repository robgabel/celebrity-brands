import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      throw new Error('Search query is required');
    }

    // Initialize OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Generate embedding for search query
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query.trim()
    });

    if (!embedding.data[0]?.embedding) {
      throw new Error('Failed to generate embedding');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Search brands using the embedding
    const { data: matches, error: searchError } = await supabase
      .rpc('match_brands_semantic', {
        query_embedding: embedding.data[0].embedding,
        match_threshold: 0.25,
        match_count: 10
      });

    if (searchError) throw searchError;

    return new Response(
      JSON.stringify(matches || []),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in semantic-search function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to perform semantic search'
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