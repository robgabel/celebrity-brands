/*
  # Add brand story functionality

  1. New Columns
    - `brand_story` (jsonb) - Stores structured brand story data
    - `last_story_update` (timestamptz) - Tracks when story was last updated

  2. Functions
    - `handle_brand_story_update()` - Updates timestamp when story changes

  3. Triggers
    - `update_brand_story_timestamp` - Automatically updates last_story_update
*/

-- Add brand_story columns to brands table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'brand_story'
  ) THEN
    ALTER TABLE brands ADD COLUMN brand_story jsonb;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'last_story_update'
  ) THEN
    ALTER TABLE brands ADD COLUMN last_story_update timestamptz;
  END IF;
END $$;

-- Create or replace the function for handling story updates
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;

CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();