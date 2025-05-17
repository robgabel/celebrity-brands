import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { backOff } from 'exponential-backoff';
import dotenv from 'dotenv';

// Enhanced retry configuration
const RETRY_CONFIG = {
  numOfAttempts: 5,
  startingDelay: 5000, // 5 seconds
  maxDelay: 30000, // 30 seconds
  jitter: 'full',
  timeMultiple: 2,
  retry: (e, attemptNumber) => {
    const isNetworkError = e.message?.includes('fetch failed') || 
                          e.message?.includes('network') ||
                          e.message?.includes('timeout');
    
    if (isNetworkError) {
      console.log(`[${new Date().toISOString()}] Network error detected, implementing longer delay...`);
      return true;
    }
    
    const isRateLimit = e.message?.includes('rate limit') || 
                       e.message?.includes('429');
    
    if (isRateLimit) {
      console.log(`[${new Date().toISOString()}] Rate limit detected, waiting longer...`);
      return true;
    }
    
    console.log(`[${new Date().toISOString()}] Attempt ${attemptNumber} failed:`, e.message);
    return attemptNumber < 5;
  }
};

// Processing configuration
const BATCH_SIZE = 1; // Process one brand at a time
const DELAY_BETWEEN_BATCHES = 15000; // 15 seconds between batches
const NETWORK_ERROR_DELAY = 30000; // 30 seconds after network error

console.log('Starting brand embeddings update script...');

// Load environment variables
console.log('Loading environment variables...');
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Checking environment variables...');
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}
console.log('Environment variables loaded successfully');

// Initialize Supabase client
console.log('Initializing Supabase client...');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase client initialized');

// Initialize axios instance with defaults
const api = axios.create({
  timeout: 45000, // 45 second timeout
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateBrandEmbedding(brandId) {
  const operation = async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Updating embedding for brand ID ${brandId}...`);
    
    const { data, error } = await supabase
      .rpc('update_brand_embedding', { brand_id: brandId });

    if (error) throw error;

    console.log(`[${timestamp}] ✅ Successfully queued embedding update for brand ID ${brandId}`);
    return true;
  };

  try {
    await backOff(operation, RETRY_CONFIG);
    return true;
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ❌ Failed to update embedding for brand ID ${brandId}:`, error.message);
    
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      console.log(`[${timestamp}] Network error detected, waiting ${NETWORK_ERROR_DELAY/1000}s...`);
      await sleep(NETWORK_ERROR_DELAY);
    }
    
    return false;
  }
}

async function processEmbeddingQueue() {
  const operation = async () => {
    console.log(`[${new Date().toISOString()}] Processing embedding queue...`);
    
    const response = await api.post(
      `${SUPABASE_URL}/functions/v1/update-embeddings`
    );

    console.log(`[${new Date().toISOString()}] ✅ Successfully processed embedding queue:`, response.data);
    return response.data;
  };

  try {
    return await backOff(operation, RETRY_CONFIG);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to process embedding queue:`, error.message);
    return null;
  }
}

async function processBrandsInBatches(brands) {
  const results = {
    successCount: 0,
    failureCount: 0
  };

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);
    console.log(`\n[${new Date().toISOString()}] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(brands.length/BATCH_SIZE)}`);
    
    // Process brands in batch sequentially to avoid overwhelming the API
    for (const brand of batch) {
      const success = await updateBrandEmbedding(brand.id);
      if (success) {
        consecutiveErrors = 0;
        results.successCount++;
      } else {
        consecutiveErrors++;
        results.failureCount++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.log(`[${new Date().toISOString()}] ⚠️ ${MAX_CONSECUTIVE_ERRORS} consecutive errors detected, implementing cooling period...`);
          await sleep(NETWORK_ERROR_DELAY);
          consecutiveErrors = 0;
        }
      }
      
      // Dynamic delay based on recent errors
      const baseDelay = 2000;
      const errorMultiplier = Math.pow(2, consecutiveErrors);
      const delay = Math.min(baseDelay * errorMultiplier, 30000);
      await sleep(delay);
    }

    if (i + BATCH_SIZE < brands.length) {
      console.log(`[${new Date().toISOString()}] Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return results;
}

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Script loaded, running main function...`);
    console.log(`[${new Date().toISOString()}] Starting main process...`);
    console.log(`[${new Date().toISOString()}] Fetching brands with NULL embeddings...\n`);
    
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name')
      .is('embedding', null);

    if (error) {
      console.error(`[${new Date().toISOString()}] Error fetching brands:`, error);
      throw error;
    }

    if (!brands?.length) {
      console.log(`[${new Date().toISOString()}] No brands found with NULL embeddings.`);
      return;
    }

    console.log(`\n[${new Date().toISOString()}] Total brands to update: ${brands.length}`);
    console.log(`[${new Date().toISOString()}] Starting updates in batches...\n`);
    
    const results = await processBrandsInBatches(brands);
    
    // Add delay before processing queue
    await sleep(5000);

    // Process the embedding queue
    console.log(`\n[${new Date().toISOString()}] Processing embedding queue...`);
    await processEmbeddingQueue();

    // Final delay to ensure all operations complete
    await sleep(5000);

    console.log(`\n[${new Date().toISOString()}] === Update Complete ===`);
    console.log(`[${new Date().toISOString()}] Total brands processed: ${brands.length}`);
    console.log(`[${new Date().toISOString()}] ✅ Successfully queued: ${results.successCount} brands`);
    console.log(`[${new Date().toISOString()}] ❌ Failed to queue: ${results.failureCount}`);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Script failed:`, error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error(`[${new Date().toISOString()}] Unhandled error in main:`, error);
  process.exit(1);
});