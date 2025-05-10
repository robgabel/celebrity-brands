/*
  # Add approval status to brands table

  1. Changes
    - Adds approval_status column to brands table
    - Sets up check constraint for valid status values
    - Updates existing brands to approved status
    - Modifies RLS policies to filter by approval status

  2. Security
    - Updates RLS policies to only show approved brands to public
    - Maintains existing security model
*/

-- Add ApprovalStatus column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'brands' 
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.brands 
    ADD COLUMN approval_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'valid_approval_status'
  ) THEN
    ALTER TABLE public.brands
    ADD CONSTRAINT valid_approval_status
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Set all existing brands to 'approved' status
UPDATE public.brands
SET approval_status = 'approved'
WHERE approval_status = 'pending';

-- Update RLS policies
DROP POLICY IF EXISTS "Enable public read access for brands" ON public.brands;

-- Create new policy that only allows reading approved brands
CREATE POLICY "Enable public read access for approved brands"
ON public.brands
FOR SELECT
TO public
USING (approval_status = 'approved');

-- Create policy for authenticated users to read all brands
CREATE POLICY "Enable authenticated users to read all brands"
ON public.brands
FOR SELECT
TO authenticated
USING (true);