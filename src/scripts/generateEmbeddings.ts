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

async function generateEmbeddingWithRetry(brandId: number, maxRetries = 3): Promise<void> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
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
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Successfully generated embedding for brand ${brandId}`);
      return;
    } catch (err) {
      attempt++;
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to generate embedding after ${maxRetries} attempts: ${err.message}`);
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 second delay
      console.log(`Attempt ${attempt} failed for brand ${brandId}. Retrying in ${delay/1000} seconds...`);
      await setTimeout(delay); // Using timers/promises setTimeout
    }
  }
}

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
        await generateEmbeddingWithRetry(brand.id);
        successCount++;

        // Add a small delay to avoid rate limits
        await setTimeout(200); // Using timers/promises setTimeout
      } catch (err) {
        console.error(`Failed to generate embedding for brand ${brand.id}:`, err.message);
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