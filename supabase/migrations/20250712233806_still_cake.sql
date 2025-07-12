/*
  # Create match_brands RPC function for semantic search

  1. New Functions
    - `match_brands` - Performs vector similarity search on brand embeddings
  
  2. Purpose
    - Enables semantic search functionality by comparing query embeddings with brand embeddings
    - Returns brands with similarity scores above the specified threshold
    - Orders results by similarity score (highest first)
*/

-- Create the match_brands function for semantic search
CREATE OR REPLACE FUNCTION match_brands(
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brands.id,
    brands.name,
    brands.creators,
    brands.product_category,
    brands.description,
    (1 - (brands.embedding <=> query_embedding)) AS similarity
  FROM brands
  WHERE 
    brands.approval_status = 'approved'
    AND brands.embedding IS NOT NULL
    AND (1 - (brands.embedding <=> query_embedding)) > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;