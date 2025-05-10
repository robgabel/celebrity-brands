/*
  # Update favorite_brands RLS policies

  1. Changes
    - Drop existing policies
    - Create new policies with correct auth.uid() checks
    - Add policies for all CRUD operations

  2. Security
    - Enable RLS
    - Add separate policies for SELECT, INSERT, and DELETE operations
    - Ensure users can only manage their own favorites
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users own favorites" ON public.favorite_brands;
DROP POLICY IF EXISTS "Enable insert access for users own favorites" ON public.favorite_brands;
DROP POLICY IF EXISTS "Enable delete access for users own favorites" ON public.favorite_brands;

-- Create new policies with correct auth checks
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