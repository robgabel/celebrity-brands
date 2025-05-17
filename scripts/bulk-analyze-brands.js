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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeBrand(brandId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/analyze-brands`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ brandId })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully analyzed brand ID ${brandId}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to analyze brand ID ${brandId}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    console.log('Fetching brands with NULL descriptions...');
    
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name')
      .is('description', null);

    if (error) throw error;

    if (!brands || brands.length === 0) {
      console.log('No brands found with NULL descriptions.');
      return;
    }

    console.log(`Found ${brands.length} brands to analyze.`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const [index, brand] of brands.entries()) {
      console.log(`\nProcessing ${index + 1}/${brands.length}: ${brand.name} (ID: ${brand.id})`);
      
      const result = await analyzeBrand(brand.id);
      
      if (result?.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Wait between calls to avoid rate limiting
      if (index < brands.length - 1) {
        await sleep(DELAY_BETWEEN_CALLS);
      }
    }

    console.log('\nAnalysis complete!');
    console.log(`✅ Successfully analyzed: ${successCount}`);
    console.log(`❌ Failed to analyze: ${failureCount}`);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();