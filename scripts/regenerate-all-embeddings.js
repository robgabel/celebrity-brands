#!/usr/bin/env node

/**
 * Regenerate ALL brand embeddings (including existing ones)
 * Use this after updating brand descriptions or other searchable content
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
    console.log(`✅ Successfully regenerated embedding for brand ${brandId} (${result.embeddingLength} dimensions)`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to generate embedding for brand ${brandId}:`, error.message);
    throw error;
  }
}

async function regenerateAllEmbeddings() {
  try {
    console.log('🔄 Regenerating embeddings for ALL approved brands...');

    // Get all approved brands
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, description')
      .eq('approval_status', 'approved')
      .order('id');

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brands || brands.length === 0) {
      console.log('❌ No approved brands found!');
      return;
    }

    console.log(`📊 Found ${brands.length} approved brands to process`);
    console.log('🚀 Starting embedding regeneration...\n');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];
    const startTime = Date.now();

    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      
      try {
        await generateEmbeddingForBrand(brand.id);
        successCount++;
        
        // Progress indicator
        const progress = Math.round(((i + 1) / brands.length) * 100);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const rate = (i + 1) / elapsed * 60; // brands per minute
        
        console.log(`📈 Progress: ${i + 1}/${brands.length} (${progress}%) - ${rate.toFixed(1)} brands/min\n`);
        
        // Add delay to avoid rate limiting
        if (i < brands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        failureCount++;
        failures.push({ 
          brandId: brand.id, 
          brandName: brand.name, 
          error: error.message 
        });
        
        // If rate limited, wait longer
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          console.log('⏳ Rate limit detected, waiting 10 seconds...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log('\n🎉 Embedding regeneration complete!');
    console.log('=====================================');
    console.log(`⏱️  Total time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📊 Success rate: ${Math.round(successCount / brands.length * 100)}%`);

    if (failures.length > 0) {
      console.log('\n❌ Failed brands:');
      failures.forEach((failure, index) => {
        console.log(`  ${index + 1}. Brand ${failure.brandId} (${failure.brandName}): ${failure.error}`);
      });
    }

    // Verify final state
    console.log('\n🔍 Verifying embeddings...');
    const { data: updatedBrands, error: verifyError } = await supabase
      .from('brands')
      .select('id, embedding, last_embedded_at')
      .eq('approval_status', 'approved');

    if (!verifyError && updatedBrands) {
      const validEmbeddings = updatedBrands.filter(b => 
        b.embedding && 
        Array.isArray(b.embedding) && 
        b.embedding.length > 0 &&
        !b.embedding.every(val => val === 0)
      );
      
      const recentlyUpdated = updatedBrands.filter(b => {
        if (!b.last_embedded_at) return false;
        const updateTime = new Date(b.last_embedded_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return updateTime > oneHourAgo;
      });
      
      console.log(`📊 Brands with valid embeddings: ${validEmbeddings.length}/${updatedBrands.length}`);
      console.log(`📊 Recently updated embeddings: ${recentlyUpdated.length}`);
      
      if (validEmbeddings.length === updatedBrands.length) {
        console.log('🎉 All brands now have valid embeddings!');
      }
    }

  } catch (error) {
    console.error('💥 Error during embedding regeneration:', error);
    process.exit(1);
  }
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Script interrupted by user. Exiting gracefully...');
  process.exit(0);
});

// Run the script
console.log('🔄 Celebrity Brands - Regenerate ALL Embeddings');
console.log('===============================================\n');

regenerateAllEmbeddings()
  .then(() => {
    console.log('\n✨ All embeddings regenerated! Your semantic search is now up-to-date.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });