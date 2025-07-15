/*
  # Fix match_brands function for semantic search

  1. Drop existing function if it exists
  2. Create new match_brands function with correct vector dimensions
  3. Ensure it works with text-embedding-3-small (1536 dimensions)
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS match_brands(vector, float, int);
DROP FUNCTION IF EXISTS match_brands(vector(1536), float, int);

-- Create the match_brands function with correct signature
CREATE OR REPLACE FUNCTION match_brands(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE(
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION match_brands(vector(1536), float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION match_brands(vector(1536), float, int) TO anon;
GRANT EXECUTE ON FUNCTION match_brands(vector(1536), float, int) TO service_role;