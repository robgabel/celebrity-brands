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

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database queries...\n');
    
    // 1. Count total brands
    const { count: totalBrands, error: totalError } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('Error counting total brands:', totalError);
      return;
    }
    
    console.log(`📊 Total brands in database: ${totalBrands}`);
    
    // 2. Count brands with NULL product_category
    const { count: nullProductCategory, error: nullProdError } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .is('product_category', null);
    
    if (nullProdError) {
      console.error('Error counting NULL product_category:', nullProdError);
      return;
    }
    
    console.log(`📊 Brands with NULL product_category: ${nullProductCategory}`);
    
    // 3. Count brands with NULL type_of_influencer
    const { count: nullTypeInfluencer, error: nullTypeError } = await supabase
      .from('brands')
      .select('*', { count: 'exact', head: true })
      .is('type_of_influencer', null);
    
    if (nullTypeError) {
      console.error('Error counting NULL type_of_influencer:', nullTypeError);
      return;
    }
    
    console.log(`📊 Brands with NULL type_of_influencer: ${nullTypeInfluencer}`);
    
    // 4. Get actual brands with NULL product_category (first 10)
    const { data: nullProdBrands, error: nullProdBrandsError } = await supabase
      .from('brands')
      .select('id, name, product_category, type_of_influencer, approval_status')
      .is('product_category', null)
      .limit(10);
    
    if (nullProdBrandsError) {
      console.error('Error fetching NULL product_category brands:', nullProdBrandsError);
      return;
    }
    
    console.log('\n📋 First 10 brands with NULL product_category:');
    nullProdBrands?.forEach(brand => {
      console.log(`  - ID: ${brand.id}, Name: ${brand.name}, Status: ${brand.approval_status}`);
    });
    
    // 5. Test the OR query that's failing
    const { data: orQueryBrands, error: orQueryError } = await supabase
      .from('brands')
      .select('id, name, product_category, type_of_influencer, approval_status')
      .or('product_category.is.null,type_of_influencer.is.null')
      .limit(5);
    
    if (orQueryError) {
      console.error('Error with OR query:', orQueryError);
      return;
    }
    
    console.log('\n📋 First 5 brands from OR query:');
    orQueryBrands?.forEach(brand => {
      console.log(`  - ID: ${brand.id}, Name: ${brand.name}, ProdCat: ${brand.product_category || 'NULL'}, TypeInfl: ${brand.type_of_influencer || 'NULL'}`);
    });
    
    // 6. Check approval statuses
    const { data: approvalStatuses, error: approvalError } = await supabase
      .from('brands')
      .select('approval_status')
      .not('approval_status', 'is', null);
    
    if (approvalError) {
      console.error('Error fetching approval statuses:', approvalError);
      return;
    }
    
    const uniqueStatuses = [...new Set(approvalStatuses?.map(b => b.approval_status))];
    console.log('\n📋 Unique approval statuses:', uniqueStatuses);
    
  } catch (error) {
    console.error('💥 Error during debug:', error);
  }
}

// Run the script
debugDatabase();