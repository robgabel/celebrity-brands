/*
  # Add brand story functionality

  1. New Columns
    - `brand_story` (jsonb) - Stores structured brand story data
    - `last_story_update` (timestamptz) - Tracks when story was last updated
  
  2. Triggers
    - Creates trigger function to automatically update last_story_update timestamp
    - Creates trigger on brand_story column updates
*/

-- Add brand_story column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'brand_story'
  ) THEN
    ALTER TABLE brands ADD COLUMN brand_story jsonb;
  END IF;
END $$;

-- Add last_story_update column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'last_story_update'
  ) THEN
    ALTER TABLE brands ADD COLUMN last_story_update timestamptz;
  END IF;
END $$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;

CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();