import { createClient } from '@supabase/supabase-js';
import { backOff } from 'exponential-backoff';
import * as dotenv from 'dotenv';

console.log('Loading environment variables...');
dotenv.config();

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 5000;
const BATCH_SIZE = 2;
const DELAY_BETWEEN_BATCHES = 5000;
const DELAY_BETWEEN_BRANDS = 3000;

// Validate environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL ? 'Loaded ✅' : 'MISSING ❌');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Loaded ✅' : 'MISSING ❌');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Required environment variables are missing!');
  process.exit(1);
}

console.log('\nInitializing Supabase client...');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Supabase client initialized ✅');

async function updateBrandEmbedding(brandId) {
  console.log(`\nUpdating embedding for brand ID ${brandId}...`);

  const operation = async () => {
    try {
      console.log('Calling update_brand_embedding RPC...');
      const { data, error } = await supabase
        .rpc('update_brand_embedding', { brand_id: brandId });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('RPC call successful ✅');
      return true;
    } catch (err) {
      console.error('Operation failed:', err);
      throw err;
    }
  };

  return backOff(operation, {
    numOfAttempts: MAX_RETRIES,
    startingDelay: INITIAL_RETRY_DELAY,
    maxDelay: MAX_RETRY_DELAY,
    jitter: 'full',
    retry: (e, attemptNumber) => {
      console.log(`Attempt ${attemptNumber} failed:`, e.message);
      return attemptNumber < MAX_RETRIES;
    }
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      try {
        const success = await updateBrandEmbedding(brand.id);
        if (success) {
          results.successCount++;
          console.log(`✅ Successfully updated embedding for brand ${brand.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to update embedding for brand ${brand.id}:`, error);
        results.failureCount++;
      }
      
      // Add delay between brands
      console.log(`Waiting ${DELAY_BETWEEN_BRANDS/1000}s before next brand...`);
      await sleep(DELAY_BETWEEN_BRANDS);
    }

    if (i + BATCH_SIZE < brands.length) {
      console.log(`\nWaiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
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

    console.log('\n=== Update Complete ===');
    console.log(`Total brands processed: ${brands.length}`);
    console.log(`✅ Successfully updated: ${results.successCount} brands`);
    console.log(`❌ Failed to update: ${results.failureCount} brands`);

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