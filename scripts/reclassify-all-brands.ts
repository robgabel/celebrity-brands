#!/usr/bin/env node

/**
 * Reclassify All Brands Script
 * 
 * This script fetches all brands from the database and calls the analyze-brands
 * Edge Function to reclassify their product_category and type_of_influencer fields.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Brand {
  id: number;
  name: string;
  creators: string;
  product_category: string | null;
  type_of_influencer: string | null;
}

interface FailedBrand {
  id: number;
  name: string;
  error: string;
}

async function reclassifyAllBrands() {
  console.log('🚀 Starting reclassification of all brands...');
  console.log('=====================================\n');
  
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const failedBrands: FailedBrand[] = [];
  const startTime = Date.now();

  try {
    // Fetch all brands
    console.log('📊 Fetching all brands from the database...');
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, creators, product_category, type_of_influencer')
      .order('id');

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('❌ No brands found in the database.');
      return;
    }

    console.log(`✅ Found ${brands.length} brands to process.\n`);

    // Show current statistics
    const nullProductCategory = brands.filter(b => !b.product_category).length;
    const nullTypeOfInfluencer = brands.filter(b => !b.type_of_influencer).length;
    
    console.log('📈 Current Statistics:');
    console.log(`   - Brands missing product_category: ${nullProductCategory}`);
    console.log(`   - Brands missing type_of_influencer: ${nullTypeOfInfluencer}`);
    console.log(`   - Total brands to process: ${brands.length}\n`);

    // Process each brand
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const progress = `${i + 1}/${brands.length}`;
      
      console.log(`🔄 [${progress}] Processing: ${brand.name} (ID: ${brand.id})`);
      
      try {
        // Call the analyze-brands Edge Function
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
          let errorMessage = `HTTP ${response.status}`;
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage += ` - ${errorText.substring(0, 100)}`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        
        if (result.success && result.analysis) {
          console.log(`   ✅ Success! Category: ${result.analysis.product_category}, Type: ${result.analysis.type_of_influencer}`);
          successCount++;
        } else {
          throw new Error('Invalid response format from analyze-brands function');
        }

      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message}`);
        failureCount++;
        failedBrands.push({
          id: brand.id,
          name: brand.name,
          error: error.message
        });
        
        // If it's a rate limit error, add a longer delay
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          console.log('   ⏳ Rate limit detected, waiting 10 seconds...');
          await setTimeout(10000);
        }
      }

      // Add delay between requests to avoid rate limiting
      if (i < brands.length - 1) {
        await setTimeout(1500); // 1.5 second delay between requests
      }
      
      // Show progress every 10 brands
      if ((i + 1) % 10 === 0 || i === brands.length - 1) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = (i + 1) / elapsed * 60; // brands per minute
        console.log(`   📊 Progress: ${i + 1}/${brands.length} (${Math.round((i + 1) / brands.length * 100)}%) - ${rate.toFixed(1)} brands/min\n`);
      }
    }

    // Final results
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('\n🎉 Reclassification Complete!');
    console.log('===============================');
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Success rate: ${Math.round(successCount / brands.length * 100)}%`);

    if (failedBrands.length > 0) {
      console.log('\n❌ Failed Brands:');
      failedBrands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ID: ${brand.id}, Name: "${brand.name}"`);
        console.log(`      Error: ${brand.error}`);
      });
      
      console.log('\n💡 Tip: You can retry failed brands by running the script again.');
      console.log('   The script will attempt to process all brands, including previously failed ones.');
    }

    // Show final statistics
    console.log('\n📈 Checking final statistics...');
    const { data: finalBrands } = await supabase
      .from('brands')
      .select('product_category, type_of_influencer');
    
    if (finalBrands) {
      const finalNullProductCategory = finalBrands.filter(b => !b.product_category).length;
      const finalNullTypeOfInfluencer = finalBrands.filter(b => !b.type_of_influencer).length;
      
      console.log(`   - Brands still missing product_category: ${finalNullProductCategory}`);
      console.log(`   - Brands still missing type_of_influencer: ${finalNullTypeOfInfluencer}`);
    }

  } catch (error: any) {
    console.error('\n💥 Fatal error during reclassification:', error.message);
    process.exit(1);
  }
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user. Exiting gracefully...');
  process.exit(0);
});

// Run the script
console.log('🤖 Celebrity Brands - Reclassification Script');
console.log('==============================================\n');

reclassifyAllBrands()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });