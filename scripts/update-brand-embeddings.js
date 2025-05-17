import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

// Delay between API calls to avoid rate limiting
const DELAY_BETWEEN_CALLS = 2000; // 2 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateBrandEmbedding(brandId, retryCount = 0) {
  try {
    console.log(`Updating embedding for brand ID ${brandId}...`);
    
    // Call the update_brand_embedding function
    const { data, error } = await supabase
      .rpc('update_brand_embedding', { brand_id: brandId });

    if (error) throw error;

    console.log(`✅ Successfully queued embedding update for brand ID ${brandId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update embedding for brand ID ${brandId}:`, error.message || error);
    
    // Implement exponential backoff retry
    if (retryCount < MAX_RETRIES) {
      const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying in ${retryDelay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(retryDelay);
      return updateBrandEmbedding(brandId, retryCount + 1);
    }
    
    return false;
  }
}

async function processEmbeddingQueue() {
  try {
    console.log('Processing embedding queue...');
    
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

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    console.log('✅ Successfully processed embedding queue:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to process embedding queue:', error.message || error);
    return null;
  }
}

async function main() {
  try {
    console.log('Fetching brands with NULL embeddings...\n');
    
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name')
      .is('embedding', null);

    if (error) throw error;

    if (!brands.length) {
      console.log('No brands found with NULL embeddings.');
      return;
    }

    console.log(`\nTotal brands to update: ${brands.length}`);
    console.log('Starting updates...\n');
    
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
    console.log('\nProcessing embedding queue...');
    await processEmbeddingQueue();

    console.log('\n=== Update Complete ===');
    console.log(`Total brands processed: ${brands.length}`);
    console.log(`✅ Successfully queued: ${successCount} brands`);
    console.log(`❌ Failed to queue: ${failureCount}`);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();