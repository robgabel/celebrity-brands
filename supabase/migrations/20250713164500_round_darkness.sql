/*
  # Add is_collab column to brand_suggestions table

  1. Changes
    - Add `is_collab` column to `brand_suggestions` table as boolean with default false
  
  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_suggestions' AND column_name = 'is_collab'
  ) THEN
    ALTER TABLE brand_suggestions ADD COLUMN is_collab boolean NOT NULL DEFAULT false;
  END IF;
END $$;