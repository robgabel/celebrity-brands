/*
  # Make user_id nullable in brand_suggestions table

  1. Changes
    - Make user_id column nullable to allow anonymous brand suggestions
    - This allows users to suggest brands without being logged in

  2. Security
    - RLS policies already handle access control
    - Anonymous users can insert, authenticated users can read their own data
*/

DO $$
BEGIN
  -- Make user_id nullable if it exists and is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_suggestions' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE brand_suggestions ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;