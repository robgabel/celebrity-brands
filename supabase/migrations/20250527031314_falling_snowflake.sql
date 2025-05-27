/*
  # Add Wikipedia URL to brands table

  1. Changes
    - Add wikipedia_url column to brands table
    - Add index for wikipedia_url column
*/

-- Add wikipedia_url column if it doesn't exist
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS wikipedia_url text;

-- Create index for wikipedia_url column
CREATE INDEX IF NOT EXISTS idx_brands_wikipedia_url ON brands (wikipedia_url);