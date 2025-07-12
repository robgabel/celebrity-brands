/*
  # Create match_brands RPC function for semantic search

  1. New Functions
    - `match_brands` - Performs vector similarity search on brand embeddings
  
  2. Purpose
    - Enables semantic search functionality by finding brands similar to a query embedding
    - Returns brands with similarity scores above a threshold
*/

-- Create the match_brands function for semantic search
CREATE OR REPLACE FUNCTION match_brands(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
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
    (brands.embedding <=> query_embedding) * -1 + 1 AS similarity
  FROM brands
  WHERE 
    brands.approval_status = 'approved'
    AND brands.embedding IS NOT NULL
    AND (brands.embedding <=> query_embedding) * -1 + 1 > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;