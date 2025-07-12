/*
  # Update match_brands function threshold

  1. Function Updates
    - Update `match_brands` function to set default `match_threshold` to 0.5
    - Maintains all existing functionality and permissions
  
  2. Changes
    - Changed default match_threshold from 0.25 to 0.5
    - Higher threshold means more restrictive matching (only very similar results)
*/

CREATE OR REPLACE FUNCTION match_brands(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5, -- Set to 0.5 for more restrictive matching
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  creators text,
  product_category text,
  description text,
  year_founded integer,
  type_of_influencer text,
  brand_collab boolean,
  logo_url text,
  homepage_url text,
  social_links jsonb,
  approval_status text,
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
    brands.year_founded,
    brands.type_of_influencer,
    brands.brand_collab,
    brands.logo_url,
    brands.homepage_url,
    brands.social_links,
    brands.approval_status,
    (1 - (brands.embedding <=> query_embedding)) AS similarity
  FROM brands
  WHERE
    brands.embedding IS NOT NULL
    AND brands.approval_status = 'approved'
    AND (1 - (brands.embedding <=> query_embedding)) > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION match_brands TO anon, authenticated;