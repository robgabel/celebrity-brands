import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function BrandStoryDebugger() {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const log = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testBrandStoryUpdate = async () => {
    setIsRunning(true);
    setResults([]);
    
    const brandId = 386; // HAPPI
    
    try {
      log('🔍 Starting brand_story update test...');
      
      // 1. Check current state
      log('1. Checking current brand state...');
      const { data: currentBrand, error: fetchError } = await supabase
        .from('brands')
        .select('id, name, brand_story, last_story_update, approval_status')
        .eq('id', brandId)
        .single();
      
      if (fetchError) {
        log(`❌ Error fetching brand: ${fetchError.message}`);
        return;
      }
      
      log(`✅ Current state: ${JSON.stringify({
        id: currentBrand.id,
        name: currentBrand.name,
        approval_status: currentBrand.approval_status,
        has_brand_story: !!currentBrand.brand_story,
        last_story_update: currentBrand.last_story_update
      })}`);
      
      // 2. Test simple update
      log('2. Testing simple field update...');
      const { error: simpleUpdateError } = await supabase
        .from('brands')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', brandId);
      
      if (simpleUpdateError) {
        log(`❌ Simple update failed: ${simpleUpdateError.message}`);
        return;
      }
      log('✅ Simple update succeeded');
      
      // 3. Test brand_story update with object
      log('3. Testing brand_story update with object...');
      const testStory = {
        summary: "Test story summary",
        full_story: ["Test story content paragraph 1", "Test story content paragraph 2"],
        key_events: ["Test event 1", "Test event 2"],
        metrics: { test_metric: "test_value" }
      };
      
      log(`📝 Attempting to save object: ${JSON.stringify(testStory).substring(0, 100)}...`);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('brands')
        .update({
          brand_story: testStory,
          last_story_update: new Date().toISOString()
        })
        .eq('id', brandId)
        .select('id, brand_story, last_story_update');
      
      if (updateError) {
        log(`❌ Object update failed: ${updateError.message}`);
        log(`Error details: ${JSON.stringify(updateError)}`);
      } else {
        log('✅ Object update operation completed');
        log(`📊 Update result: ${JSON.stringify(updateResult)}`);
      }
      
      // 4. Verify the update
      log('4. Verifying update...');
      const { data: verifyBrand, error: verifyError } = await supabase
        .from('brands')
        .select('id, name, brand_story, last_story_update')
        .eq('id', brandId)
        .single();
      
      if (verifyError) {
        log(`❌ Verification fetch failed: ${verifyError.message}`);
        return;
      }
      
      log(`🔍 Verification result: ${JSON.stringify({
        id: verifyBrand.id,
        name: verifyBrand.name,
        has_brand_story: !!verifyBrand.brand_story,
        brand_story_type: typeof verifyBrand.brand_story,
        last_story_update: verifyBrand.last_story_update
      })}`);
      
      if (verifyBrand.brand_story) {
        log('✅ SUCCESS: brand_story was saved!');
        log(`📖 Story content: ${JSON.stringify(verifyBrand.brand_story).substring(0, 200)}...`);
      } else {
        log('❌ FAILURE: brand_story is still NULL');
      }
      
      // 5. Test with different structure matching your function
      log('5. Testing with function-style structure...');
      const functionStyleStory = {
        story: "Test story content from function style",
        key_events: ["Test event 1", "Test event 2"],
        metrics: { test_metric: "test_value" }
      };
      
      const { error: functionStyleError } = await supabase
        .from('brands')
        .update({
          brand_story: functionStyleStory,
          last_story_update: new Date().toISOString()
        })
        .eq('id', brandId);
      
      if (functionStyleError) {
        log(`❌ Function-style update failed: ${functionStyleError.message}`);
      } else {
        log('✅ Function-style update succeeded');
        
        // Verify function-style update
        const { data: functionVerify } = await supabase
          .from('brands')
          .select('brand_story, last_story_update')
          .eq('id', brandId)
          .single();
        
        log(`📊 Function-style result: ${JSON.stringify({
          has_brand_story: !!functionVerify?.brand_story,
          last_story_update: functionVerify?.last_story_update,
          content_preview: functionVerify?.brand_story ? JSON.stringify(functionVerify.brand_story).substring(0, 100) + '...' : 'NULL'
        })}`);
      }
      
    } catch (error: any) {
      log(`💥 Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 m-4">
      <h2 className="text-xl font-bold text-white mb-4">Brand Story Debug Test</h2>
      
      <button
        onClick={testBrandStoryUpdate}
        disabled={isRunning}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded mb-4"
      >
        {isRunning ? 'Running Test...' : 'Run Brand Story Update Test'}
      </button>
      
      <div className="bg-gray-900 rounded p-4 max-h-96 overflow-y-auto">
        <pre className="text-green-400 text-sm whitespace-pre-wrap">
          {results.join('\n')}
        </pre>
      </div>
    </div>
  );
}