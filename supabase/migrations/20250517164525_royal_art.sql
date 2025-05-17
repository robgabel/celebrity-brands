/*
  # Add brand ID sequence and function
  
  1. New Sequence
    - Creates a sequence for brand IDs if it doesn't exist
    - Sets the sequence to start after the highest existing ID
  
  2. New Function
    - Adds next_brand_id() function to safely get the next available ID
    - Handles concurrent access safely
*/

-- Create sequence if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'brands_id_seq') THEN
    -- Get the current maximum ID
    CREATE SEQUENCE IF NOT EXISTS brands_id_seq;
    
    -- Set the sequence to start after current maximum
    PERFORM setval(
      'brands_id_seq', 
      COALESCE((SELECT MAX(id) FROM brands), 0), 
      true
    );
  END IF;
END $$;

-- Create function to get next ID
CREATE OR REPLACE FUNCTION next_brand_id()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_id bigint;
BEGIN
  -- Get next value from sequence
  SELECT nextval('brands_id_seq') INTO next_id;
  
  -- Return the next ID
  RETURN next_id;
END;
$$;