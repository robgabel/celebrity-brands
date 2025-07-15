#!/usr/bin/env node

/**
 * Debug script to test brand_story updates using direct REST API calls
 */

import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

async function debugBrandStoryUpdate() {
  const brandId = 386; // HAPPI brand ID
  
  console.log('🔍 Debugging brand_story update for brand ID:', brandId);
  
  try {
    // 1. Check if brand exists and get current state
    console.log('\n1. Checking current brand state...');
    const fetchResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=id,name,brand_story,last_story_update,approval_status`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('❌ Error fetching brand:', errorText);
      return;
    }
    
    const brands = await fetchResponse.json();
    const currentBrand = brands[0];
    
    if (!currentBrand) {
      console.error('❌ Brand not found');
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
    const simpleUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        updated_at: new Date().toISOString()
      })
    });
    
    if (!simpleUpdateResponse.ok) {
      const errorText = await simpleUpdateResponse.text();
      console.error('❌ Simple update failed:', errorText);
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
    
    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        brand_story: testStory,
        last_story_update: new Date().toISOString()
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Brand story update failed:', errorText);
      return;
    }
    
    console.log('✅ Update operation completed');
    
    // 4. Verify the update by fetching again
    console.log('\n4. Verifying update...');
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=id,name,brand_story,last_story_update`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('❌ Verification fetch failed:', errorText);
      return;
    }
    
    const verifyBrands = await verifyResponse.json();
    const verifyBrand = verifyBrands[0];
    
    console.log('🔍 Verification result:', {
      id: verifyBrand.id,
      name: verifyBrand.name,
      has_brand_story: !!verifyBrand.brand_story,
      brand_story_content: verifyBrand.brand_story ? 'Present' : 'NULL',
      last_story_update: verifyBrand.last_story_update
    });
    
    if (verifyBrand.brand_story) {
      console.log('✅ SUCCESS: brand_story was saved!');
      console.log('📖 Story preview:', JSON.stringify(verifyBrand.brand_story).substring(0, 100) + '...');
    } else {
      console.log('❌ FAILURE: brand_story is still NULL');
    }
    
    // 5. Test with different data types
    console.log('\n5. Testing with string instead of object...');
    const stringUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        brand_story: JSON.stringify(testStory)
      })
    });
    
    if (!stringUpdateResponse.ok) {
      const errorText = await stringUpdateResponse.text();
      console.error('❌ String update failed:', errorText);
    } else {
      console.log('✅ String update succeeded');
      
      // Verify string update
      const stringVerifyResponse = await fetch(`${supabaseUrl}/rest/v1/brands?id=eq.${brandId}&select=brand_story`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (stringVerifyResponse.ok) {
        const stringVerifyBrands = await stringVerifyResponse.json();
        const stringVerify = stringVerifyBrands[0];
        
        console.log('📊 String update result:', {
          has_brand_story: !!stringVerify?.brand_story,
          type: typeof stringVerify?.brand_story
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugBrandStoryUpdate();