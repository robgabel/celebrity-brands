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

// Delay between API calls to avoid rate limiting
const DELAY_BETWEEN_CALLS = 2000; // 2 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateBrandEmbedding(brandId, retryCount = 0) {
  try {
    console.log(`[${new Date().toISOString()}] Updating embedding for brand ID ${brandId}...`);
    
    // Call the update_brand_embedding function
    const { data, error } = await supabase
      .rpc('update_brand_embedding', { brand_id: brandId });

    if (error) {
      console.error(`[${new Date().toISOString()}] RPC error:`, error);
      throw error;
    }

    console.log(`[${new Date().toISOString()}] ✅ Successfully queued embedding update for brand ID ${brandId}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Failed to update embedding for brand ID ${brandId}:`, error.message || error);
    
    // Implement exponential backoff retry
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
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/update-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

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
    console.log(`[${new Date().toISOString()}] Starting updates...\n`);
    
    let successCount = 0;
    let failureCount = 0;

    // Queue embedding updates for all brands
    for (const [index, brand] of brands.entries()) {
      console.log(`Processing ${index + 1}/${brands.length}: ${brand.name} (ID: ${brand.id})`);
      
      const success = await updateBrandEmbedding(brand.id);
      
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Wait between calls to avoid rate limiting
      if (index < brands.length - 1) {
        await sleep(DELAY_BETWEEN_CALLS);
      }
    }

    // Process the embedding queue
    console.log(`\n[${new Date().toISOString()}] Processing embedding queue...`);
    await processEmbeddingQueue();

    console.log(`\n[${new Date().toISOString()}] === Update Complete ===`);
    console.log(`[${new Date().toISOString()}] Total brands processed: ${brands.length}`);
    console.log(`[${new Date().toISOString()}] ✅ Successfully queued: ${successCount} brands`);
    console.log(`[${new Date().toISOString()}] ❌ Failed to queue: ${failureCount}`);
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