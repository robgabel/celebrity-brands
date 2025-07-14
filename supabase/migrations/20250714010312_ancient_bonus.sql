/*
  # Add GIN indexes for improved text search performance

  1. Extensions
    - Enable pg_trgm extension for trigram-based text matching

  2. New Indexes
    - `idx_brands_name_gin_trgm` - GIN index on brands.name for fast ILIKE searches
    - `idx_brands_creators_gin_trgm` - GIN index on brands.creators for fast ILIKE searches
    - `idx_brands_description_gin_trgm` - GIN index on brands.description for fast ILIKE searches

  3. Performance Impact
    - Dramatically improves performance of ILIKE queries with leading wildcards
    - Optimizes text search functionality on the explore brands page
    - Reduces query time from seconds to milliseconds for text-based filtering
*/

-- Enable pg_trgm extension for trigram-based text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fast text search on brands table
-- These indexes will significantly speed up ILIKE queries

-- Index for brand name searches
CREATE INDEX IF NOT EXISTS idx_brands_name_gin_trgm 
ON brands 
USING gin (name gin_trgm_ops);

-- Index for creators searches  
CREATE INDEX IF NOT EXISTS idx_brands_creators_gin_trgm 
ON brands 
USING gin (creators gin_trgm_ops);

-- Index for description searches
CREATE INDEX IF NOT EXISTS idx_brands_description_gin_trgm 
ON brands 
USING gin (description gin_trgm_ops);

-- Create a composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_brands_approval_category_name 
ON brands (approval_status, product_category, name);

-- Create index for founder type filtering
CREATE INDEX IF NOT EXISTS idx_brands_approval_founder_type 
ON brands (approval_status, type_of_influencer);

-- Create index for brand type filtering (own vs collab)
CREATE INDEX IF NOT EXISTS idx_brands_approval_collab 
ON brands (approval_status, brand_collab);