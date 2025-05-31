/*
  # Add brand story functionality
  
  1. New Columns
    - `brand_story` (jsonb) - Stores the AI-generated brand story content
    - `last_story_update` (timestamptz) - Tracks when the story was last updated
  
  2. Trigger
    - Automatically updates `last_story_update` when brand story is modified
*/

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'brand_story'
  ) THEN
    ALTER TABLE brands ADD COLUMN brand_story jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'last_story_update'
  ) THEN
    ALTER TABLE brands ADD COLUMN last_story_update timestamptz;
  END IF;
END $$;

-- Create trigger function
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;

CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();