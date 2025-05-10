/*
  # Update brands table RLS policies

  1. Changes
    - Enable RLS on brands table
    - Add policy for public read access to brands table
    - Add policy for authenticated users to suggest brands

  2. Security
    - Ensures brands data is publicly readable
    - Maintains secure write access
*/

-- Enable RLS on brands table if not already enabled
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Brands are viewable by everyone" ON public.brands;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.brands;

-- Create policy for public read access
CREATE POLICY "Enable public read access for brands"
ON public.brands
FOR SELECT
TO public
USING (true);

-- Create policy for authenticated users to suggest brands
CREATE POLICY "Enable authenticated users to suggest brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (true);