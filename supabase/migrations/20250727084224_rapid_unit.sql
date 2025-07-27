/*
  # Fix Brand Story Generation Policies

  1. Security
    - Add explicit service_role policy for brand updates
    - Ensure service_role can bypass RLS for story generation
    - Clean up conflicting policies

  2. Changes
    - Add service_role full access policy for brands table
    - Ensure story generation can always update brands
*/

-- Add explicit service_role policy to bypass RLS for brand story updates
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow service_role to update brands" ON brands;
END $$;

CREATE POLICY "Allow service_role to update brands"
ON public.brands
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the brands table has proper RLS enabled
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;