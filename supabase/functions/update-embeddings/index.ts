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
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Required environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Get pending embedding requests
    const { data: pendingItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('id, record_id, text_for_embedding')
      .eq('status', 'pending')
      .limit(50);

    if (queueError) throw queueError;
    if (!pendingItems?.length) {
      return new Response(
        JSON.stringify({ message: 'No pending embeddings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${pendingItems.length} embeddings...`);

    // Process each item
    for (const item of pendingItems) {
      try {
        // Generate embedding
        const embedding = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: item.text_for_embedding.trim()
        });

        if (!embedding.data[0]?.embedding) {
          throw new Error('Failed to generate embedding');
        }

        // Update brand with new embedding
        const { error: updateError } = await supabase
          .from('brands')
          .update({ embedding: embedding.data[0].embedding })
          .eq('id', item.record_id);

        if (updateError) throw updateError;

        // Mark queue item as processed
        await supabase
          .from('embedding_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

      } catch (err) {
        console.error(`Error processing item ${item.id}:`, err);

        // Mark queue item as failed
        await supabase
          .from('embedding_queue')
          .update({
            status: 'error',
            error: err.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingItems.length
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in update-embeddings function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to update embeddings'
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