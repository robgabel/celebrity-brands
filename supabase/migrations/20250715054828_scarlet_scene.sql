-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS match_brands(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_brands(vector, float, int);
DROP FUNCTION IF EXISTS match_brands(vector(1536), double precision, integer);
DROP FUNCTION IF EXISTS match_brands(vector(1536), float, int);

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