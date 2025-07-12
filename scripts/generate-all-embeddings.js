#!/usr/bin/env node

/**
 * Generate embeddings for all brands that don't have them or have zero embeddings
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
    console.log(`✅ Successfully generated embedding for brand ${brandId} (${result.embeddingLength} dimensions)`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to generate embedding for brand ${brandId}:`, error.message);
    throw error;
  }
}

function isZeroEmbedding(embedding) {
  if (!embedding || !Array.isArray(embedding)) return true;
  
  // Check if all values are 0
  return embedding.every(value => value === 0);
}

async function generateAllEmbeddings() {
  try {
    console.log('🔍 Fetching brands that need embeddings...');

    // Get all approved brands with their current embeddings
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, embedding')
      .eq('approval_status', 'approved');

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('❌ No approved brands found!');
      return;
    }

    // Filter brands that need embeddings (NULL or all zeros)
    const brandsNeedingEmbeddings = brands.filter(brand => {
      return !brand.embedding || isZeroEmbedding(brand.embedding);
    });

    if (brandsNeedingEmbeddings.length === 0) {
      console.log('✅ All brands already have valid embeddings!');
      
      // Show some stats
      const validEmbeddings = brands.filter(b => b.embedding && !isZeroEmbedding(b.embedding));
      console.log(`📊 Total approved brands: ${brands.length}`);
      console.log(`📊 Brands with valid embeddings: ${validEmbeddings.length}`);
      return;
    }

    console.log(`📊 Total approved brands: ${brands.length}`);
    console.log(`📊 Brands needing embeddings: ${brandsNeedingEmbeddings.length}`);
    
    // Show breakdown
    const nullEmbeddings = brands.filter(b => !b.embedding).length;
    const zeroEmbeddings = brands.filter(b => b.embedding && isZeroEmbedding(b.embedding)).length;
    
    console.log(`  - NULL embeddings: ${nullEmbeddings}`);
    console.log(`  - Zero embeddings: ${zeroEmbeddings}`);
    console.log('🚀 Starting embedding generation...\n');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (let i = 0; i < brandsNeedingEmbeddings.length; i++) {
      const brand = brandsNeedingEmbeddings[i];
      
      try {
        await generateEmbeddingForBrand(brand.id);
        successCount++;
        
        // Progress indicator
        const progress = Math.round(((i + 1) / brandsNeedingEmbeddings.length) * 100);
        console.log(`📈 Progress: ${i + 1}/${brandsNeedingEmbeddings.length} (${progress}%)\n`);
        
        // Add a small delay to avoid rate limiting
        if (i < brandsNeedingEmbeddings.length - 1) {
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
    console.log('\n🔍 Verifying embeddings...');
    const { data: updatedBrands, error: verifyError } = await supabase
      .from('brands')
      .select('id, embedding')
      .eq('approval_status', 'approved');

    if (!verifyError && updatedBrands) {
      const validEmbeddings = updatedBrands.filter(b => b.embedding && !isZeroEmbedding(b.embedding));
      const stillNeedEmbeddings = updatedBrands.filter(b => !b.embedding || isZeroEmbedding(b.embedding));
      
      console.log(`📊 Brands with valid embeddings: ${validEmbeddings.length}/${updatedBrands.length}`);
      
      if (stillNeedEmbeddings.length > 0) {
        console.log(`⚠️  Brands still needing embeddings: ${stillNeedEmbeddings.length}`);
        stillNeedEmbeddings.slice(0, 5).forEach(brand => {
          console.log(`  - Brand ${brand.id}: ${brand.embedding ? 'Zero embedding' : 'NULL embedding'}`);
        });
        if (stillNeedEmbeddings.length > 5) {
          console.log(`  ... and ${stillNeedEmbeddings.length - 5} more`);
        }
      } else {
        console.log('🎉 All brands now have valid embeddings!');
      }
    }

  } catch (error) {
    console.error('💥 Error during embedding generation:', error);
    process.exit(1);
  }
}

// Run the script
console.log('🤖 Starting embedding generation for all brands (including zero embeddings)...\n');
generateAllEmbeddings()
  .then(() => {
    console.log('\n✨ All done! Your semantic search should now work properly.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });