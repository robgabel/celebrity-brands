/*
  # Fix RLS policy for brand_suggestions table

  1. Security Changes
    - Enable RLS on brand_suggestions table
    - Add policy to allow anonymous users to insert suggestions
    - Add policy to allow users to read their own suggestions (if they have user_id)
    - Add policy for admins to read all suggestions

  This allows unauthenticated users to submit brand suggestions while maintaining security.
*/

-- Enable RLS on brand_suggestions table
ALTER TABLE brand_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert brand suggestions
CREATE POLICY "brand_suggestions_insert_anon"
  ON brand_suggestions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert brand suggestions
CREATE POLICY "brand_suggestions_insert_authenticated"
  ON brand_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to read their own suggestions (if they have user_id)
CREATE POLICY "brand_suggestions_select_own"
  ON brand_suggestions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow admins to read all suggestions
CREATE POLICY "brand_suggestions_admin_select"
  ON brand_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = auth.uid()::text
      AND user_profiles.is_admin = true
    )
  );