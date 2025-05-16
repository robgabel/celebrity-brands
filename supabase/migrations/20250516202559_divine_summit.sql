/*
  # Add brand story support
  
  1. New Columns
    - `brand_story` (jsonb): Stores the generated brand story
    - `last_story_update` (timestamptz): Tracks when the story was last updated
  
  2. Security
    - Enable public read access for approved brand stories
  
  3. Triggers
    - Add trigger to update last_story_update timestamp when story changes
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