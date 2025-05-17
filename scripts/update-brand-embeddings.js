import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

// Enhanced configuration for retries and delays
const DELAY_BETWEEN_CALLS = 5000; // Increased to 5 seconds
const MAX_RETRIES = 5; // Increased from 3 to 5
const INITIAL_RETRY_DELAY = 2000; // Increased to 2 seconds
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateBrandEmbedding(brandId, retryCount = 0) {
  try {
    console.log(`[${new Date().toISOString()}] Updating embedding for brand ID ${brandId}...`);
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Call the update_brand_embedding function with timeout
    const { data, error } = await supabase
      .rpc('update_brand_embedding', { brand_id: brandId })
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error) {
      console.error(`[${new Date().toISOString()}] RPC error:`, error);
      throw error;
    }

    console.log(`[${new Date().toISOString()}] ✅ Successfully queued embedding update for brand ID ${brandId}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to update embedding for brand ID ${brandId}:`, error.message || error);
    
    // Check if error is due to timeout or network issues
    if (error.name === 'AbortError' || error.message?.includes('fetch failed')) {
      console.log(`[${new Date().toISOString()}] Network or timeout error detected, implementing longer delay...`);
      await sleep(5000); // Additional delay for network issues
    }
    
    // Implement exponential backoff retry with increased delays
    if (retryCount < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`[${new Date().toISOString()}] Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(retryDelay);
      return updateBrandEmbedding(brandId, retryCount + 1);
    }
    
    return false;
  }
}

async function processEmbeddingQueue() {
  try {
    console.log(`[${new Date().toISOString()}] Processing embedding queue...`);
    
    console.log(`[${new Date().toISOString()}] Making request to update-embeddings function...`);
    
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/update-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    console.log(`[${new Date().toISOString()}] Response status:`, response.status);
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[${new Date().toISOString()}] Error response:`, data);
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    console.log(`[${new Date().toISOString()}] ✅ Successfully processed embedding queue:`, data);
    return data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to process embedding queue:`, error.message || error);
    console.error('Full error:', error);
    return null;
  }
}

async function processBrandsInBatches(brands) {
  const batchSize = MAX_CONCURRENT_REQUESTS;
  const results = {
    successCount: 0,
    failureCount: 0
  };

  for (let i = 0; i < brands.length; i += batchSize) {
    const batch = brands.slice(i, i + batchSize);
    const promises = batch.map(brand => updateBrandEmbedding(brand.id));
    
    const batchResults = await Promise.all(promises);
    
    results.successCount += batchResults.filter(result => result).length;
    results.failureCount += batchResults.filter(result => !result).length;

    // Add delay between batches
    if (i + batchSize < brands.length) {
      await sleep(DELAY_BETWEEN_CALLS);
    }
  }

  return results;
}

async function main() {
  try {
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

    if (!brands.length) {
      console.log(`[${new Date().toISOString()}] No brands found with NULL embeddings.`);
      return;
    }

    console.log(`\n[${new Date().toISOString()}] Total brands to update: ${brands.length}`);
    console.log(`[${new Date().toISOString()}] Starting updates in batches...\n`);
    
    const results = await processBrandsInBatches(brands);

    // Process the embedding queue
    console.log(`\n[${new Date().toISOString()}] Processing embedding queue...`);
    await processEmbeddingQueue();

    console.log(`\n[${new Date().toISOString()}] === Update Complete ===`);
    console.log(`[${new Date().toISOString()}] Total brands processed: ${brands.length}`);
    console.log(`[${new Date().toISOString()}] ✅ Successfully queued: ${results.successCount} brands`);
    console.log(`[${new Date().toISOString()}] ❌ Failed to queue: ${results.failureCount}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Script failed:`, error);
    console.error('Full error:', error);
    process.exit(1);
  }
}

console.log(`[${new Date().toISOString()}] Script loaded, running main function...`);

// Run the script
main().catch(error => {
  console.error(`[${new Date().toISOString()}] Unhandled error in main:`, error);
  process.exit(1);
});