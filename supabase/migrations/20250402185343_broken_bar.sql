/*
  # Update favorite_brands RLS policies

  1. Changes
    - Drop existing policies
    - Create new unified policy for all operations
    - Ensure proper auth.uid() checks

  2. Security
    - Enable RLS
    - Add single policy for all operations
    - Ensure users can only manage their own favorites
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for users own favorites" ON public.favorite_brands;
DROP POLICY IF EXISTS "Enable insert access for users own favorites" ON public.favorite_brands;
DROP POLICY IF EXISTS "Enable delete access for users own favorites" ON public.favorite_brands;

-- Create a single unified policy for all operations
CREATE POLICY "Users can manage their own favorites"
ON public.favorite_brands
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);