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

async function processEmbeddings() {
  try {
    console.log('Starting batch embedding processing...');
    
    const { data, error } = await supabase
      .rpc('process_brand_embeddings');

    if (error) {
      throw error;
    }

    console.log('Batch processing results:', data);
    
    if (data.errors > 0) {
      console.log('\nChecking error details...');
      const { data: logData } = await supabase
        .from('embedding_processing_logs')
        .select('error_details')
        .eq('id', data.log_id)
        .single();
        
      if (logData?.error_details) {
        console.log('\nErrors encountered:');
        logData.error_details.forEach((error: string) => {
          console.log('-', error);
        });
      }
    }
  } catch (error) {
    console.error('Error processing embeddings:', error);
  }
}

// Run the script
processEmbeddings();