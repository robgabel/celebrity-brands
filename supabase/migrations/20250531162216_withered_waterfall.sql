/*
  # Add brand ID sequence and function
  
  1. Changes
    - Creates brands_id_seq sequence if it doesn't exist
    - Creates next_brand_id() function to generate sequential IDs
    - Ensures sequence is owned by brands.id column
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS brands_id_seq;

-- Make sure sequence is owned by brands.id column
ALTER SEQUENCE brands_id_seq OWNED BY brands.id;

-- Create function to get next ID
CREATE OR REPLACE FUNCTION next_brand_id()
RETURNS bigint AS $$
DECLARE
  next_id bigint;
BEGIN
  SELECT nextval('brands_id_seq') INTO next_id;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;