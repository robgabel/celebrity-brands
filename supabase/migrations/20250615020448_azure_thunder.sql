/*
  # Add Semantic Search Function - Mellow Fire

  1. New Functions
    - `match_brands()` - Semantic search function for brand matching using vector similarity

  2. Features
    - Vector similarity search using cosine distance
    - Configurable similarity threshold and result count
    - Returns brands with similarity scores
*/

-- Create or replace the semantic search function
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
LANGUAGE sql STABLE
AS $$
  SELECT
    brands.id,
    brands.name,
    brands.creators,
    brands.product_category,
    brands.description,
    1 - (brands.embedding <=> query_embedding) AS similarity
  FROM brands
  WHERE 
    brands.approval_status = 'approved'
    AND brands.embedding IS NOT NULL
    AND 1 - (brands.embedding <=> query_embedding) > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
$$;