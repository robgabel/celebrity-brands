import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

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

    let successCount = 0;
    let failureCount = 0;

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
          const errorText = await response.text();
          let errorMessage = `HTTP error! status: ${response.status}`;
          
          try {
            // Try to parse error as JSON
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If not JSON, use text as is
            errorMessage += ` - ${errorText}`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`Successfully analyzed brand ${brand.id}:`, result);
        successCount++;

        // Check if the analysis actually updated the product_category
        const { data: updatedBrand, error: checkError } = await supabase
          .from('brands')
          .select('product_category')
          .eq('id', brand.id)
          .single();

        if (checkError) {
          console.warn(`Warning: Could not verify update for brand ${brand.id}:`, checkError);
        } else if (!updatedBrand.product_category) {
          console.warn(`Warning: Brand ${brand.id} was processed but product_category is still NULL`);
        }
      } catch (error) {
        console.error(`Failed to analyze brand ${brand.id}:`, error);
        failureCount++;
      }

      await setTimeout(1000); // 1 second delay between requests
    }

    console.log(`Analysis complete. Success: ${successCount}, Failures: ${failureCount}`);
  } catch (error) {
    console.error('Error during brand analysis:', error);
  }
}

// Run the script
analyzeBrands();