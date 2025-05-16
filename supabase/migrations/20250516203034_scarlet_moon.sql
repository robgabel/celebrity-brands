/*
  # Add brand story columns and trigger

  1. Changes
    - Add brand_story JSONB column to store AI-generated narratives
    - Add last_story_update timestamp to track updates
    - Add trigger to automatically update timestamp
    - Check for existing policy before creating

  2. Security
    - Maintains existing RLS policies
*/

-- Add brand_story column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS brand_story jsonb,
ADD COLUMN IF NOT EXISTS last_story_update timestamptz;

-- Update RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable public read access for brand stories' AND tablename = 'brands') THEN
        CREATE POLICY "Enable public read access for brand stories"
        ON brands
        FOR SELECT
        TO public
        USING (approval_status = 'approved');
    END IF;
END$$;

-- Update trigger to handle story updates
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_story_update = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_brand_story_timestamp'
    ) THEN
        CREATE TRIGGER update_brand_story_timestamp
        BEFORE UPDATE OF brand_story
        ON brands
        FOR EACH ROW
        EXECUTE FUNCTION handle_brand_story_update();
    END IF;
END$$;