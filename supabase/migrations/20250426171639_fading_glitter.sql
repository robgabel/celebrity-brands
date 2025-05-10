/*
  # Update approval status for brands

  1. Changes
    - Sets approval_status to 'pending' for brands with ID 1 and 2
    - Uses a single UPDATE statement for efficiency

  2. Security
    - Maintains existing RLS policies
    - No security changes needed as this is a data update only
*/

UPDATE public.brands
SET approval_status = 'pending'
WHERE id IN (1, 2);