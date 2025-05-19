/*
  # Add Performance Indexes

  1. Changes
    - Add composite indexes for common query patterns
    - Add indexes for case-insensitive searches
    - Add indexes for sorting operations

  2. Performance Impact
    - Improves query performance for brand searches
    - Optimizes sorting operations
    - Enhances filtering performance
*/

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_brands_approved_search 
ON brands(approval_status, LOWER(name), LOWER(creators))
WHERE approval_status = 'approved';

-- Add index for case-insensitive name search
CREATE INDEX IF NOT EXISTS idx_brands_name_lower 
ON brands(LOWER(name));

-- Add index for case-insensitive creators search
CREATE INDEX IF NOT EXISTS idx_brands_creators_lower 
ON brands(LOWER(creators));

-- Add index for sorting by year founded
CREATE INDEX IF NOT EXISTS idx_brands_year_founded 
ON brands(year_founded DESC);

-- Add composite index for category filtering
CREATE INDEX IF NOT EXISTS idx_brands_category_status 
ON brands(product_category, approval_status);

-- Add composite index for founder type filtering
CREATE INDEX IF NOT EXISTS idx_brands_founder_status 
ON brands(type_of_influencer, approval_status);