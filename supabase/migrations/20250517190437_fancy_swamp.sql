/*
  # Add vector search capabilities
  
  1. Changes
    - Enable pgvector extension
    - Add embedding column to brands table
    - Add GiST index for faster similarity searches
    - Add function to match brands by semantic similarity
  
  2. Security
    - Function is accessible to public role for search
*/

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create GiST index for faster similarity searches
CREATE INDEX IF NOT EXISTS brands_embedding_idx ON brands 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to search brands by semantic similarity
CREATE OR REPLACE FUNCTION match_brands_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  creators text,
  product_category text,
  description text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brands.id,
    brands.name,
    brands.creators,
    brands.product_category,
    brands.description,
    1 - (brands.embedding <=> query_embedding) as similarity
  FROM brands
  WHERE 1 - (brands.embedding <=> query_embedding) > match_threshold
  AND approval_status = 'approved'
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;