/*
  # Add brand story support
  
  1. Changes
    - Add brand_story JSONB column to brands table
    - Add last_story_update timestamp column
    - Add trigger to automatically update last_story_update timestamp
*/

-- Add brand_story column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS brand_story jsonb,
ADD COLUMN IF NOT EXISTS last_story_update timestamptz;

-- Update trigger to handle story updates
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();