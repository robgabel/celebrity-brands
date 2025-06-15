/*
  # Create match_brands RPC function for semantic search

  1. New Functions
    - `match_brands` - Performs vector similarity search on brands table
    - Returns brands with similarity scores above threshold
  
  2. Requirements
    - Requires pgvector extension for vector operations
    - Uses cosine similarity for matching
    - Filters by approval_status = 'approved'
*/

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

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
  year_founded int,
  type_of_influencer text,
  brand_collab boolean,
  logo_url text,
  homepage_url text,
  social_links jsonb,
  approval_status text,
  created_at timestamptz,
  updated_at timestamptz,
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
    brands.created_at,
    brands.updated_at,
    (1 - (brands.embedding <=> query_embedding)) as similarity
  FROM brands
  WHERE 
    brands.embedding IS NOT NULL
    AND brands.approval_status = 'approved'
    AND (1 - (brands.embedding <=> query_embedding)) > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;