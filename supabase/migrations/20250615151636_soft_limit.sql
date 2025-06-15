/*
  # Add brand story support

  1. New Columns
    - `brand_story` (jsonb) - Stores structured brand story data
    - `last_story_update` (timestamptz) - Tracks when story was last updated

  2. Security
    - Enable public read access for approved brand stories

  3. Triggers
    - Auto-update timestamp when brand_story is modified
*/

-- Add brand_story columns if they don't exist
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

-- Drop and recreate policy for brand stories
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable public read access for brand stories" ON brands;
END $$;

CREATE POLICY "Enable public read access for brand stories"
ON brands
FOR SELECT
TO public
USING (approval_status = 'approved');

-- Create or replace the story update function
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for story updates
DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;

CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();