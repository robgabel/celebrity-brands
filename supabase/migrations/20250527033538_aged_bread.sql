/*
  # Initialize Brand Embeddings

  1. Changes
    - Creates a new function to initialize brand embeddings with proper vector(1536) arrays
    - Uses array_fill to create valid zero vectors
    - Handles NULL and invalid embeddings
  
  2. Security
    - Function runs with SECURITY INVOKER permissions
    - Uses public schema search path
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS queue_brand_embedding(bigint);
DROP FUNCTION IF EXISTS process_brand_embeddings();

-- Create the queue function with proper vector initialization
CREATE OR REPLACE FUNCTION queue_brand_embedding(p_brand_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_zero_vector vector(1536);
BEGIN
  -- Create a proper zero vector using array_fill
  v_zero_vector := array_fill(0.0, ARRAY[1536])::vector(1536);

  -- Validate brand exists
  IF NOT EXISTS (SELECT 1 FROM brands WHERE id = p_brand_id) THEN
    RAISE EXCEPTION 'Brand not found with ID %', p_brand_id;
  END IF;

  -- Initialize the brand with a proper zero vector
  UPDATE brands
  SET embedding = v_zero_vector,
      updated_at = NOW()
  WHERE id = p_brand_id
  RETURNING json_build_object(
    'success', true,
    'message', 'Brand embedding initialized',
    'brand_id', id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Create the processing function
CREATE OR REPLACE FUNCTION process_brand_embeddings()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_processed integer := 0;
  v_errors integer := 0;
  v_log_id uuid;
  v_brand record;
  v_result json;
  v_zero_vector vector(1536);
BEGIN
  -- Create a proper zero vector using array_fill
  v_zero_vector := array_fill(0.0, ARRAY[1536])::vector(1536);

  -- Create a log entry
  INSERT INTO embedding_processing_logs (started_at)
  VALUES (NOW())
  RETURNING id INTO v_log_id;

  -- Process each brand that needs embedding
  FOR v_brand IN 
    SELECT id 
    FROM brands 
    WHERE embedding IS NULL
  LOOP
    BEGIN
      -- Initialize brand with proper zero vector
      UPDATE brands
      SET embedding = v_zero_vector,
          updated_at = NOW()
      WHERE id = v_brand.id;
      
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      
      -- Update log with error details
      UPDATE embedding_processing_logs
      SET error_details = array_append(error_details, format('Error processing brand %s: %s', v_brand.id, SQLERRM))
      WHERE id = v_log_id;
    END;
  END LOOP;

  -- Update log entry with results
  UPDATE embedding_processing_logs
  SET 
    completed_at = NOW(),
    brands_processed = v_processed,
    errors_count = v_errors
  WHERE id = v_log_id
  RETURNING json_build_object(
    'success', true,
    'processed', v_processed,
    'errors', v_errors,
    'log_id', id
  ) INTO v_result;

  RETURN v_result;
END;
$$;