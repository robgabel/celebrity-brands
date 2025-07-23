/*
  # Optimize Brands Table Performance

  1. New Indexes
    - `idx_brands_created_at` - Index on created_at for "Recently Added" queries
    - `idx_brands_approval_created_at` - Composite index for approved brands ordered by creation date
    - `idx_brands_approval_year_founded` - Composite index for approved brands ordered by year founded

  2. Performance Benefits
    - Faster homepage "Recently Added Brands" queries
    - Improved Explore page sorting performance
    - Better query performance for approved brands filtering
*/

-- Index for recently added brands queries (used on homepage)
CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands (created_at DESC);

-- Composite index for approved brands ordered by creation date
CREATE INDEX IF NOT EXISTS idx_brands_approval_created_at ON brands (approval_status, created_at DESC) 
WHERE approval_status = 'approved';

-- Composite index for approved brands ordered by year founded
CREATE INDEX IF NOT EXISTS idx_brands_approval_year_founded ON brands (approval_status, year_founded DESC) 
WHERE approval_status = 'approved';

-- Index for name-based sorting of approved brands
CREATE INDEX IF NOT EXISTS idx_brands_approval_name ON brands (approval_status, name) 
WHERE approval_status = 'approved';