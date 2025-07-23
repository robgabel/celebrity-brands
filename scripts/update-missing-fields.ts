#!/usr/bin/env node

/**
 * Update Missing Brand Fields Script
 * 
 * This script finds brands missing specific fields (logo_url, homepage_url, social_links)
 * and calls the analyze-brands Edge Function to fill them in.
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
  logo_url: string | null;
  homepage_url: string | null;
  social_links: Record<string, string> | null;
}

interface FailedBrand {
  id: number;
  name: string;
  error: string;
}

async function updateMissingFields() {
  console.log('🔍 Finding brands with missing fields...');
  console.log('=====================================\n');
  
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const failedBrands: FailedBrand[] = [];
  const startTime = Date.now();

  try {
    // Fetch brands missing logo_url, homepage_url, or social_links
    console.log('📊 Fetching brands with missing fields...');
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, creators, logo_url, homepage_url, social_links, approval_status')
      .eq('approval_status', 'approved')
      .or('logo_url.is.null,homepage_url.is.null,social_links.is.null')
      .order('id');

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('✅ No brands found with missing fields!');
      return;
    }

    console.log(`✅ Found ${brands.length} brands with missing fields.\n`);

    // Show current statistics
    const missingLogo = brands.filter(b => !b.logo_url).length;
    const missingHomepage = brands.filter(b => !b.homepage_url).length;
    const missingSocial = brands.filter(b => !b.social_links).length;
    
    console.log('📈 Current Statistics:');
    console.log(`   - Brands missing logo_url: ${missingLogo}`);
    console.log(`   - Brands missing homepage_url: ${missingHomepage}`);
    console.log(`   - Brands missing social_links: ${missingSocial}`);
    console.log(`   - Total brands to process: ${brands.length}\n`);

    // Process each brand
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const progress = `${i + 1}/${brands.length}`;
      
      console.log(`🔄 [${progress}] Processing: ${brand.name} (ID: ${brand.id})`);
      
      // Show what fields are missing
      const missingFields = [];
      if (!brand.logo_url) missingFields.push('logo_url');
      if (!brand.homepage_url) missingFields.push('homepage_url');
      if (!brand.social_links) missingFields.push('social_links');
      console.log(`   Missing: ${missingFields.join(', ')}`);
      
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
          const analysis = result.analysis;
          const updatedFields = [];
          if (analysis.logo_url) updatedFields.push('logo_url');
          if (analysis.homepage_url) updatedFields.push('homepage_url');
          if (analysis.social_links) updatedFields.push('social_links');
          
          console.log(`   ✅ Success! Updated: ${updatedFields.length > 0 ? updatedFields.join(', ') : 'no new fields found'}`);
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
    console.log('\n🎉 Field Update Complete!');
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
    }

    // Show final statistics
    console.log('\n📈 Checking final statistics...');
    const { data: finalBrands } = await supabase
      .from('brands')
      .select('logo_url, homepage_url, social_links')
      .eq('approval_status', 'approved');
    
    if (finalBrands) {
      const finalMissingLogo = finalBrands.filter(b => !b.logo_url).length;
      const finalMissingHomepage = finalBrands.filter(b => !b.homepage_url).length;
      const finalMissingSocial = finalBrands.filter(b => !b.social_links).length;
      
      console.log(`   - Brands still missing logo_url: ${finalMissingLogo}`);
      console.log(`   - Brands still missing homepage_url: ${finalMissingHomepage}`);
      console.log(`   - Brands still missing social_links: ${finalMissingSocial}`);
    }

  } catch (error: any) {
    console.error('\n💥 Fatal error during field update:', error.message);
    process.exit(1);
  }
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user. Exiting gracefully...');
  process.exit(0);
});

// Run the script
console.log('🔗 Celebrity Brands - Missing Fields Update Script');
console.log('=================================================\n');

updateMissingFields()
  .then(() => {
    console.log('\n✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });