import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400'
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000;
const MAX_DELAY = 10000;
const BATCH_SIZE = 2;

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_DELAY,
  maxDelay = MAX_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0) throw error;
    
    // Calculate delay with exponential backoff and jitter
    const jitteredDelay = Math.min(
      delay + (Math.random() * 1000),
      maxDelay
    );
    
    console.log(`Retrying operation after ${jitteredDelay}ms, ${retries} attempts remaining...`);
    console.log(`Error was: ${error.message}`);
    
    await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    
    return retryWithExponentialBackoff(
      operation,
      retries - 1,
      Math.min(delay * 2, maxDelay),
      maxDelay
    );
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const processedIds = new Set<string>();

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Required environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ 
      apiKey: openaiKey,
      timeout: 60000, // 60 second timeout
      maxRetries: 3
    });

    // Get pending embedding requests
    const { data: pendingItems, error: queueError } = await supabase
      .from('embedding_queue')
      .select('id, record_id, text_for_embedding')
      .eq('status', 'pending') 
      .limit(BATCH_SIZE);

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
      // Skip if already processed
      if (processedIds.has(item.id)) continue;
      
      try {
        // Generate embedding with retry
        const embedding = await retryWithExponentialBackoff(async () => {
          // Validate and clean input text
          const cleanText = item.text_for_embedding
            .trim()
            .slice(0, 8000) // Limit text length
            .replace(/\s+/g, ' '); // Normalize whitespace

          if (!cleanText) {
            throw new Error('Empty text after cleaning');
          }

          const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: cleanText
          });

          if (!response.data[0]?.embedding) {
            throw new Error('Empty embedding response');
          }

          return response;
        });

        processedIds.add(item.id);

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
        
        // Add longer delay between items
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err) {
        results.failed++;
        const errorMsg = `Brand ${item.record_id}: ${err.message || 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);

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

        // Add much longer delay after error
        await new Promise(resolve => setTimeout(resolve, 10000));
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