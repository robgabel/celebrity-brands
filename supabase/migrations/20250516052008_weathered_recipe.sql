/*
  # Add brand story column and function

  1. Changes
    - Add brand_story column to brands table to store the AI-generated narrative
    - Add last_story_update to track when the story was last generated/updated

  2. Security
    - Enable RLS policies to control access to the brand story
*/

-- Add brand_story column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS brand_story jsonb,
ADD COLUMN IF NOT EXISTS last_story_update timestamptz;

-- Update RLS policies
CREATE POLICY "Enable public read access for brand stories"
ON brands
FOR SELECT
TO public
USING (approval_status = 'approved');

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