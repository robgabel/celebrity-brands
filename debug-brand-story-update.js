#!/usr/bin/env node

/**
 * Debug script to test brand_story updates directly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBrandStoryUpdate() {
  const brandId = 386; // HAPPI brand ID
  
  console.log('🔍 Debugging brand_story update for brand ID:', brandId);
  
  try {
    // 1. Check if brand exists and get current state
    console.log('\n1. Checking current brand state...');
    const { data: currentBrand, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, brand_story, last_story_update, approval_status')
      .eq('id', brandId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching brand:', fetchError);
      return;
    }
    
    console.log('✅ Current brand state:', {
      id: currentBrand.id,
      name: currentBrand.name,
      approval_status: currentBrand.approval_status,
      has_brand_story: !!currentBrand.brand_story,
      last_story_update: currentBrand.last_story_update
    });
    
    // 2. Test simple update first
    console.log('\n2. Testing simple field update...');
    const { error: simpleUpdateError } = await supabase
      .from('brands')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);
    
    if (simpleUpdateError) {
      console.error('❌ Simple update failed:', simpleUpdateError);
      return;
    }
    console.log('✅ Simple update succeeded');
    
    // 3. Test brand_story update with minimal data
    console.log('\n3. Testing brand_story update...');
    const testStory = {
      story: "Test story content",
      key_events: ["Test event"],
      metrics: { test_metric: "test_value" }
    };
    
    console.log('📝 Attempting to save:', JSON.stringify(testStory, null, 2));
    
    const { data: updateResult, error: updateError } = await supabase
      .from('brands')
      .update({
        brand_story: testStory,
        last_story_update: new Date().toISOString()
      })
      .eq('id', brandId)
      .select('id, brand_story, last_story_update');
    
    if (updateError) {
      console.error('❌ Brand story update failed:', updateError);
      console.error('Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return;
    }
    
    console.log('✅ Update operation completed');
    console.log('📊 Update result:', updateResult);
    
    // 4. Verify the update by fetching again
    console.log('\n4. Verifying update...');
    const { data: verifyBrand, error: verifyError } = await supabase
      .from('brands')
      .select('id, name, brand_story, last_story_update')
      .eq('id', brandId)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification fetch failed:', verifyError);
      return;
    }
    
    console.log('🔍 Verification result:', {
      id: verifyBrand.id,
      name: verifyBrand.name,
      has_brand_story: !!verifyBrand.brand_story,
      brand_story_content: verifyBrand.brand_story ? 'Present' : 'NULL',
      last_story_update: verifyBrand.last_story_update
    });
    
    if (verifyBrand.brand_story) {
      console.log('✅ SUCCESS: brand_story was saved!');
      console.log('📖 Story preview:', verifyBrand.brand_story.story?.substring(0, 100) + '...');
    } else {
      console.log('❌ FAILURE: brand_story is still NULL');
    }
    
    // 5. Check database schema for brand_story column
    console.log('\n5. Checking database schema...');
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'brands' 
          AND column_name IN ('brand_story', 'last_story_update')
          ORDER BY column_name;
        `
      });
    
    if (schemaError) {
      console.error('❌ Schema check failed:', schemaError);
    } else {
      console.log('📋 Schema info:', schemaInfo);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugBrandStoryUpdate();