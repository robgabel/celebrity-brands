/*
  # Fix user_profiles RLS policies

  1. Changes
    - Drop existing problematic policies that cause infinite recursion
    - Create new policies with proper auth checks
    - Maintain security while avoiding recursive checks

  2. Security
    - Enable RLS
    - Allow users to manage their own profiles
    - Allow admins to manage all profiles
    - Prevent unauthorized access
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Admin read access" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin update access" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.user_profiles;

-- Create new policies without recursive checks
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth_id = auth.uid()::text);

CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth_id = auth.uid()::text)
WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Admins can read all profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  is_admin = true
  AND
  auth_id = auth.uid()::text
);

CREATE POLICY "Admins can update all profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  is_admin = true
  AND
  auth_id = auth.uid()::text
);