#!/usr/bin/env node

import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (process.argv.length < 3) {
  console.error('Please provide a word to embed. Example: node scripts/get-embedding.js "your text here"');
  process.exit(1);
}

const query = process.argv.slice(2).join(' ');

// Initialize OpenAI client with your API key
const openai = new OpenAI({ 
  apiKey: process.env.VITE_OPENAI_API_KEY 
});

async function generateEmbedding() {
  try {
    console.log(`Generating embedding for: "${query}"`);

    // IMPORTANT: Use the same model as your semantic-search Edge Function
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Same model as your Edge Functions
      input: query,
      encoding_format: 'float',
    });

    const embedding = embeddingResponse.data[0].embedding;

    console.log('\n✅ Embedding generated successfully!\n');
    console.log('📊 Embedding stats:');
    console.log(`   - Dimensions: ${embedding.length}`);
    console.log(`   - First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(6)).join(', ')}...]`);
    console.log('\n⬇️ Copy the vector below and paste it into your SQL query: ⬇️\n');
    console.log(`[${embedding.join(',')}]`);
    console.log('\n📝 Example SQL query to use in Supabase SQL Editor:');
    console.log(`
SELECT
  id,
  name,
  creators,
  product_category,
  description,
  similarity
FROM
  match_brands(
    '[${embedding.join(',')}]',
    0.0, -- match_threshold (0.0 to see all results)
    20   -- match_count (number of results to return)
  )
ORDER BY
  similarity DESC;
    `);

  } catch (error) {
    console.error('Error generating embedding:', error.message);
    if (error.response) {
      console.error('OpenAI API Error:', error.response.data);
    }
    
    // Check for common issues
    if (error.message.includes('API key')) {
      console.error('\n💡 Tip: Make sure VITE_OPENAI_API_KEY is set in your .env file');
    }
  }
}

generateEmbedding();