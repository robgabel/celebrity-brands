import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { backOff } from 'exponential-backoff';
import dotenv from 'dotenv';

// Constants for retry and rate limiting
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 5000;
const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES = 3000;

console.log('\nStarting brand embeddings update script...');

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize axios instance with defaults
const api = axios.create({
  timeout: 30000,
  baseURL: SUPABASE_URL,
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  validateStatus: (status) => status < 500 // Only retry on 5xx errors
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateBrandEmbedding(brandId) {
  const operation = async () => {
    console.log(`Updating embedding for brand ID ${brandId}...`);

    try {
      const { data, error } = await supabase
        .rpc('update_brand_embedding', { brand_id: brandId });

      if (error) throw error;

      return true;
    } catch (err) {
      console.error(`RPC error:`, err);
      throw err;
    }
  };

  try {
    await backOff(operation, {
      numOfAttempts: MAX_RETRIES,
      startingDelay: INITIAL_RETRY_DELAY,
      maxDelay: MAX_RETRY_DELAY,
      jitter: 'full',
      retry: (e, attemptNumber) => {
        console.log(`Attempt ${attemptNumber} failed: ${e.message}`);
        return attemptNumber < MAX_RETRIES;
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to update embedding for brand ID ${brandId} after ${MAX_RETRIES} attempts:`, error.message);
    return false;
  }
}

async function processEmbeddingQueue() {
  const operation = async () => {    
    // Call the Edge Function to process the queue
    const response = await api.post('/functions/v1/update-embeddings');

    if (!response.data?.success) {
      throw new Error(response.data?.error || 'Failed to process queue');
    }

    console.log('✅ Successfully processed embedding queue:', response.data);
    return response.data;
  };

  try {
    return await backOff(operation, {
      numOfAttempts: MAX_RETRIES,
      startingDelay: INITIAL_RETRY_DELAY,
      maxDelay: MAX_RETRY_DELAY,
      jitter: 'full',
      retry: (e, attemptNumber) => {
        console.log(`Queue processing attempt ${attemptNumber} failed: ${e.message}`);
        return attemptNumber < MAX_RETRIES;
      }
    });
  } catch (error) {
    console.error('❌ Failed to process embedding queue:', error.message);
    return null;
  }
}

async function processBrandsInBatches(brands) {
  const results = {
    successCount: 0,
    failureCount: 0,
  };

  for (let i = 0; i < brands.length; i += BATCH_SIZE) {
    const batch = brands.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(brands.length/BATCH_SIZE)}`);
    
    for (const brand of batch) {
      const success = await updateBrandEmbedding(brand.id);
      if (success) {
        results.successCount++;
      } else {
        results.failureCount++;
      }
      await sleep(2000); // Reduced delay between brands
    }

    if (i + BATCH_SIZE < brands.length) {
      console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }

  return results;
}

async function main() {
  try {
    console.log('Fetching brands with NULL embeddings...');
    
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name')
      .is('embedding', null);

    if (error) {
      console.error('Error fetching brands:', error);
      throw error;
    }

    if (!brands?.length) {
      console.log('No brands found with NULL embeddings.');
      return;
    }

    console.log(`Total brands to update: ${brands.length}`);
    console.log('Starting updates in batches...\n');
    
    const results = await processBrandsInBatches(brands);
    
    // Add delay before processing queue
    await sleep(10000);

    // Process the queue
    console.log('\nProcessing embedding queue...');
    await processEmbeddingQueue();

    // Final delay to ensure all operations complete
    await sleep(10000);

    console.log('\n=== Update Complete ===');
    console.log(`Total brands processed: ${brands.length}`);
    console.log(`✅ Successfully queued: ${results.successCount} brands`);
    console.log(`❌ Failed to queue: ${results.failureCount}`);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
});