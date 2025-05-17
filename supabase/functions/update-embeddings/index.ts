import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 5000; // 5 seconds

async function retryWithExponentialBackoff(operation: () => Promise<any>, retries = MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt < retries - 1) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, attempt),
          MAX_RETRY_DELAY
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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
        const embedding = await retryWithExponentialBackoff(async () => {
          const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: item.text_for_embedding.trim()
          });

          if (!response.data[0]?.embedding) {
            throw new Error('Empty embedding response');
          }

          return response;
        });

        // Update brand with new embedding
        await retryWithExponentialBackoff(async () => {
          const { error: updateError } = await supabase
            .from('brands')
            .update({ embedding: embedding.data[0].embedding })
            .eq('id', item.record_id);

          if (updateError) throw updateError;
        });

        // Mark queue item as processed
        await retryWithExponentialBackoff(async () => {
          const { error: queueError } = await supabase
            .from('embedding_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (queueError) throw queueError;
        });

        results.success++;
        console.log(`✅ Successfully updated embedding for brand ${item.record_id}`);
      } catch (err) {
        results.failed++;
        results.errors.push(`Brand ${item.record_id}: ${err.message}`);
        console.error(`Error processing brand ${item.record_id}:`, err);

        // Mark queue item as failed
        try {
          await supabase
            .from('embedding_queue')
            .update({
              status: 'error',
              error: err.message,
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
        error: error.message || 'Failed to update embeddings',
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