import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";
import { backOff } from "npm:exponential-backoff@3.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Backoff configuration
const backoffConfig = {
  numOfAttempts: 3,
  startingDelay: 1000,
  maxDelay: 5000,
  timeMultiple: 2,
  jitter: 'full'
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
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const item of pendingItems) {
      try {
        // Generate embedding with retry
        const embedding = await backOff(async () => {
          const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: item.text_for_embedding.trim()
          });

          if (!response.data[0]?.embedding) {
            throw new Error('Empty embedding response');
          }

          return response;
        }, backoffConfig);

        // Update brand with new embedding
        await backOff(async () => {
          const { error: updateError } = await supabase
            .from('brands')
            .update({ embedding: embedding.data[0].embedding })
            .eq('id', item.record_id);

          if (updateError) throw updateError;
        }, backoffConfig);

        // Mark queue item as processed
        await backOff(async () => {
          const { error: queueError } = await supabase
            .from('embedding_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (queueError) throw queueError;
        }, backoffConfig);

        results.success++;
        console.log(`✅ Successfully updated embedding for brand ${item.record_id}`);
      } catch (err) {
        results.failed++;
        const errorMsg = `Brand ${item.record_id}: ${err.message || 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`Error processing brand ${item.record_id}:`, err);

        // Mark queue item as failed
        try {
          await supabase
            .from('embedding_queue')
            .update({
              status: 'error',
              error: err.message || 'Unknown error',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);
        } catch (updateErr) {
          console.error('Failed to update queue status:', updateErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: {
          total: pendingItems.length,
          successful: results.success,
          failed: results.failed,
          errors: results.errors
        }
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
        error: error?.message || 'Failed to update embeddings',
        timestamp: new Date().toISOString()
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