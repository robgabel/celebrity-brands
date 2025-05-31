/*
  # Add vector similarity search function
  
  Creates a function to perform semantic similarity search on brands using their embeddings
*/

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
    1 - (brands.embedding <=> query_embedding) as similarity
  FROM brands
  WHERE 1 - (brands.embedding <=> query_embedding) > match_threshold
    AND brands.approval_status = 'approved'
    AND brands.embedding IS NOT NULL
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;