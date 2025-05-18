/*
  # Add unique constraint to brands table

  1. Changes
    - Add unique constraint to brands.id column to ensure no duplicate IDs
    - This ensures proper handling of potential conflicts during brand insertion

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE brands
ADD CONSTRAINT brands_id_unique UNIQUE (id);