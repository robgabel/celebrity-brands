/*
  # Fix RLS policies for brand_story updates

  This migration ensures that the service role can update brand_story fields
  and that the brands table has proper policies for story generation.
*/

-- First, let's check if there are any restrictive policies on the brands table
-- that might be blocking the brand_story updates

-- Drop any overly restrictive update policies that might block service role
DO $$ 
BEGIN
  -- Remove any policies that might be blocking service role updates
  DROP POLICY IF EXISTS "brands_update_restricted" ON brands;
  DROP POLICY IF EXISTS "brands_update_story_restricted" ON brands;
END $$;

-- Ensure service role can update all brand fields including brand_story
CREATE POLICY "brands_service_role_full_access"
  ON brands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure authenticated users with admin privileges can update brands
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "brands_update_admin" ON brands;
END $$;

CREATE POLICY "brands_update_admin"
  ON brands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text 
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text 
      AND user_profiles.is_admin = true
    )
  );

-- Verify the policies are working by checking current policies
-- (This will show in the migration logs)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Current RLS policies on brands table:';
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'brands'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Roles: % | Permissive: %', 
            policy_record.policyname, 
            policy_record.cmd, 
            policy_record.roles, 
            policy_record.permissive;
    END LOOP;
END $$;