import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeBrands() {
  try {
    console.log('Fetching brands with NULL product_category...');
    
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .is('product_category', null);

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('No brands found with NULL product_category.');
      return;
    }

    console.log(`Found ${brands.length} brands to analyze.`);

    for (const brand of brands) {
      try {
        console.log(`Analyzing brand: ${brand.name} (ID: ${brand.id})`);
        
        const response = await fetch(
          `${supabaseUrl}/functions/v1/analyze-brands`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ brandId: brand.id })
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Successfully analyzed brand ${brand.id}`);
      } catch (error) {
        console.error(`Failed to analyze brand ${brand.id}:`, error);
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Finished analyzing all brands.');
  } catch (error) {
    console.error('Error during brand analysis:', error);
  }
}

// Run the script
analyzeBrands();