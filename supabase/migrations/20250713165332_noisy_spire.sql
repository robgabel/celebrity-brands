/*
  # Make year_founded nullable in brand_suggestions

  1. Changes
    - Make year_founded column nullable in brand_suggestions table
    - This allows users to submit brand suggestions without knowing the exact founding year

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  -- Make year_founded nullable if it exists and is currently not null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_suggestions' 
    AND column_name = 'year_founded' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE brand_suggestions ALTER COLUMN year_founded DROP NOT NULL;
  END IF;
END $$;