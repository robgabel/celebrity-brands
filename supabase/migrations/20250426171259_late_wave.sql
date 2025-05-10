/*
  # Update brand approval status

  1. Changes
    - Sets approval_status to 'pending' for brand with ID 1
    - Safe update that maintains data integrity

  2. Security
    - Maintains existing RLS policies
    - No security changes needed as this is a data update only
*/

UPDATE public.brands
SET approval_status = 'pending'
WHERE id = 1;