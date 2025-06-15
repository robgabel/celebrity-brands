/*
  # Clean up duplicate policies and standardize RLS

  This migration removes duplicate policies and creates a clean, standardized set of RLS policies
  for all tables to prevent conflicts and ensure proper access control.
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable public read access for brand stories" ON brands;
DROP POLICY IF EXISTS "Enable public read access for approved brands" ON brands;
DROP POLICY IF EXISTS "Enable authenticated users to read all brands" ON brands;
DROP POLICY IF EXISTS "Allow read access to all brands for anon" ON brands;
DROP POLICY IF EXISTS "Admins can update brand table information" ON brands;
DROP POLICY IF EXISTS "Enable authenticated users to suggest brands" ON brands;

-- Create standardized policies for brands table
CREATE POLICY "brands_select_public" ON brands
  FOR SELECT TO public
  USING (approval_status = 'approved');

CREATE POLICY "brands_select_authenticated" ON brands
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "brands_insert_authenticated" ON brands
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "brands_update_admin" ON brands
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE auth_id = (auth.uid())::text 
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE auth_id = (auth.uid())::text 
      AND is_admin = true
    )
  );

-- Ensure brand_story and last_story_update columns exist
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

-- Create or replace the brand story update function
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.brand_story IS DISTINCT FROM NEW.brand_story THEN
    NEW.last_story_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;
CREATE TRIGGER update_brand_story_timestamp
  BEFORE UPDATE OF brand_story ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_story_update();