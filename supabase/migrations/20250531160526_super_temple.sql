/*
  # Add Brand Story Support

  1. Changes
    - Adds brand_story JSONB column to brands table
    - Adds last_story_update timestamp column
    - Creates trigger to automatically update last_story_update timestamp
  
  2. Security
    - Updates RLS policies for public story access
*/

DO $$ 
BEGIN
  -- Add columns if they don't exist
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

END $$;