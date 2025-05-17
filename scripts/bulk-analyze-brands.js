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
    console.log(`Analyzing brand ID ${brandId}...`);
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/analyze-brands`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ brandId })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    if (!data.success) {
      throw new Error('Analysis failed: ' + (data.error || 'Unknown error'));
    }

    console.log(`✅ Successfully analyzed brand ID ${brandId}:`, data.data?.product_category || 'No category set');
    return data;
  } catch (error) {
    console.error(`❌ Failed to analyze brand ID ${brandId}:`, error.message || error);
    return null;
  }
}

async function main() {
  try {
    console.log('Fetching brands with NULL or empty product categories...\n');
    
    // First query for NULL product categories
    const { data: nullBrands, error: nullError } = await supabase
      .from('brands')
      .select('id, name, product_category')
      .is('product_category', null);

    if (nullError) throw nullError;

    // Then query for empty string product categories
    const { data: emptyBrands, error: emptyError } = await supabase
      .from('brands')
      .select('id, name, product_category')
      .eq('product_category', '');

    if (emptyError) throw emptyError;

    // Combine results
    const brands = [...(nullBrands || []), ...(emptyBrands || [])];

    console.log(`Found ${nullBrands?.length || 0} brands with NULL product_category`);
    console.log(`Found ${emptyBrands?.length || 0} brands with empty product_category`);

    if (!brands.length) {
      console.log('No brands found with NULL or empty product categories.');
      return;
    }

    console.log(`\nTotal brands to analyze: ${brands.length}`);
    console.log('Starting analysis...\n');
    
    let successCount = 0;
    let failureCount = 0;

    for (const [index, brand] of brands.entries()) {
      console.log(`Processing ${index + 1}/${brands.length}: ${brand.name} (ID: ${brand.id})`);
      console.log(`Current category: ${brand.product_category === null ? 'NULL' : brand.product_category === '' ? 'EMPTY' : brand.product_category}`);
      
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

    console.log('\n=== Analysis Complete ===');
    console.log(`Total brands processed: ${brands.length}`);
    console.log(`✅ Successfully analyzed: ${successCount} brands`);
    console.log(`❌ Failed to analyze: ${failureCount}`);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();