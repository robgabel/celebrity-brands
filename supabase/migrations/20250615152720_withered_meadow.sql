/*
  # Add next_brand_id function for sequential ID generation

  1. New Functions
    - `next_brand_id` - Returns the next available brand ID
    - Ensures sequential ID assignment for new brands
*/

-- Create function to get next brand ID
CREATE OR REPLACE FUNCTION next_brand_id()
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  next_id bigint;
BEGIN
  -- Get the maximum ID and add 1
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM brands;
  RETURN next_id;
END;
$$;