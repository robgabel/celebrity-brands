/*
  # Update favorite_brands RLS policies

  1. Changes
    - Replace existing RLS policy with direct auth.uid() check
    - Add separate policies for SELECT, INSERT, and DELETE operations
    - Remove dependency on user_profiles table for permission checks

  2. Security
    - Enable RLS
    - Ensure users can only manage their own favorites
    - Allow authenticated users to perform CRUD operations on their own records
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their favorites" ON public.favorite_brands;

-- Create new policies
CREATE POLICY "Enable read access for users own favorites"
ON public.favorite_brands
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for users own favorites"
ON public.favorite_brands
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for users own favorites"
ON public.favorite_brands
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);