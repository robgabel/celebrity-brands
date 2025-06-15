#!/usr/bin/env node

/**
 * Generate embeddings for all brands that don't have them
 */

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

async function generateEmbeddingForBrand(brandId) {
  try {
    console.log(`Generating embedding for brand ${brandId}...`);
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-brand-embeddings`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ brandId })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`✅ Successfully generated embedding for brand ${brandId}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to generate embedding for brand ${brandId}:`, error.message);
    throw error;
  }
}

async function generateAllEmbeddings() {
  try {
    console.log('🔍 Fetching brands that need embeddings...');

    // Get all brands that don't have embeddings
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name')
      .is('embedding', null)
      .eq('approval_status', 'approved');

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('✅ All brands already have embeddings!');
      return;
    }

    console.log(`📊 Found ${brands.length} brands that need embeddings`);
    console.log('🚀 Starting embedding generation...\n');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      
      try {
        await generateEmbeddingForBrand(brand.id);
        successCount++;
        
        // Progress indicator
        const progress = Math.round(((i + 1) / brands.length) * 100);
        console.log(`📈 Progress: ${i + 1}/${brands.length} (${progress}%)\n`);
        
        // Add a small delay to avoid rate limiting
        if (i < brands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        failureCount++;
        failures.push({ brandId: brand.id, brandName: brand.name, error: error.message });
      }
    }

    console.log('\n🎉 Embedding generation complete!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (failures.length > 0) {
      console.log('\n❌ Failed brands:');
      failures.forEach(failure => {
        console.log(`  - Brand ${failure.brandId} (${failure.brandName}): ${failure.error}`);
      });
    }

    // Verify embeddings were created
    const { data: updatedBrands, error: verifyError } = await supabase
      .from('brands')
      .select('id')
      .not('embedding', 'is', null)
      .eq('approval_status', 'approved');

    if (!verifyError && updatedBrands) {
      console.log(`\n🔍 Verification: ${updatedBrands.length} brands now have embeddings`);
    }

  } catch (error) {
    console.error('💥 Error during embedding generation:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🤖 Starting embedding generation for all brands...\n');
generateAllEmbeddings()
  .then(() => {
    console.log('\n✨ All done! Your semantic search should now work properly.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });