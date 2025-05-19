/*
  # Optimize RLS Policies

  1. Changes
    - Replace inefficient admin check policy with optimized version
    - Add index on user_profiles.auth_id and is_admin for faster lookups
    - Cache admin status check result

  2. Security
    - Maintains same security level while improving performance
*/

-- Add index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_admin_check 
ON user_profiles(auth_id, is_admin);

-- Replace existing admin policy with optimized version
DROP POLICY IF EXISTS "Admins can update brand table information" ON brands;

CREATE POLICY "Admins can update brand table information"
ON brands
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.auth_id = (SELECT auth.uid()::text) 
    AND user_profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.auth_id = (SELECT auth.uid()::text) 
    AND user_profiles.is_admin = true
  )
);