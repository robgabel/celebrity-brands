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

async function generateEmbeddings() {
  try {
    console.log('Fetching brands that need embeddings...');

    // Get all brands that need embeddings
    const { data: brands, error: fetchError } = await supabase
      .from('brands')
      .select('id')
      .is('embedding', null);

    if (fetchError) throw fetchError;

    if (!brands || brands.length === 0) {
      console.log('No brands found that need embeddings.');
      return;
    }

    console.log(`Found ${brands.length} brands that need embeddings.`);

    let successCount = 0;
    let failureCount = 0;

    for (const brand of brands) {
      try {
        console.log(`Generating embedding for brand ${brand.id}...`);

        const response = await fetch(
          `${supabaseUrl}/functions/v1/generate-brand-embeddings`,
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
          const error = await response.json();
          throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Successfully generated embedding for brand ${brand.id}`);
        successCount++;

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Failed to generate embedding for brand ${brand.id}:`, err);
        failureCount++;
      }
    }

    console.log(`
Embedding generation complete:
- Total processed: ${brands.length}
- Successful: ${successCount}
- Failed: ${failureCount}
    `);
  } catch (err) {
    console.error('Error during embedding generation:', err);
  }
}

// Run the script
generateEmbeddings();