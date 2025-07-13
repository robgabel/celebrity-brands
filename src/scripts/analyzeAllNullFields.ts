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

async function analyzeAllNullFields() {
  try {
    console.log('🔍 Checking for brands with NULL fields...\n');
    
    // Check for brands missing both product_category AND type_of_influencer
    const { data: brandsNeedingAnalysis, error: fetchError } = await supabase
      .from('brands')
      .select('id, name, creators, description, product_category, type_of_influencer')
      .or('product_category.is.null,type_of_influencer.is.null');
      // Removed approval_status filter to include all brands

    if (fetchError) {
      throw new Error(`Failed to fetch brands: ${fetchError.message}`);
    }

    if (!brandsNeedingAnalysis || brandsNeedingAnalysis.length === 0) {
      console.log('✅ No brands found needing analysis.');
      return;
    }

    console.log(`📊 Found ${brandsNeedingAnalysis.length} brands needing analysis:`);
    
    // Categorize the brands
    const needsProductCategory = brandsNeedingAnalysis.filter(b => !b.product_category);
    const needsTypeOfInfluencer = brandsNeedingAnalysis.filter(b => !b.type_of_influencer);
    const needsBoth = brandsNeedingAnalysis.filter(b => !b.product_category && !b.type_of_influencer);
    
    console.log(`  - Missing product_category: ${needsProductCategory.length}`);
    console.log(`  - Missing type_of_influencer: ${needsTypeOfInfluencer.length}`);
    console.log(`  - Missing both: ${needsBoth.length}\n`);

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{brandId: number, brandName: string, error: string}> = [];

    for (const brand of brandsNeedingAnalysis) {
      try {
        console.log(`🔄 Analyzing brand: ${brand.name} (ID: ${brand.id})`);
        
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
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            errorMessage += ` - ${errorText}`;
          }
          
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`✅ Successfully analyzed brand ${brand.id}:`, result);
        successCount++;

      } catch (error: any) {
        console.error(`❌ Failed to analyze brand ${brand.id}:`, error.message);
        failureCount++;
        failures.push({
          brandId: brand.id,
          brandName: brand.name,
          error: error.message
        });
      }

      // Add delay between requests to avoid rate limiting
      await setTimeout(1000);
    }

    console.log('\n🎉 Analysis complete!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    if (failures.length > 0) {
      console.log('\n❌ Failed brands:');
      failures.forEach(failure => {
        console.log(`  - Brand ${failure.brandId} (${failure.brandName}): ${failure.error}`);
      });
    }

    // Show final statistics
    console.log('\n📊 Checking remaining NULL fields...');
    
    const { count: remainingNullProductCategory } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .is('product_category', null)
      .eq('approval_status', 'approved');
      
    const { count: remainingNullTypeOfInfluencer } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .is('type_of_influencer', null)
      .eq('approval_status', 'approved');

    console.log(`Remaining NULL product_category: ${remainingNullProductCategory || 0}`);
    console.log(`Remaining NULL type_of_influencer: ${remainingNullTypeOfInfluencer || 0}`);

  } catch (error) {
    console.error('💥 Error during analysis:', error);
  }
}

// Run the script
analyzeAllNullFields();