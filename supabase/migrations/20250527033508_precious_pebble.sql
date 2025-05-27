/*
  # Fix Brand Embeddings

  1. Changes
    - Creates a function to generate a proper 1536-dimensional zero vector
    - Updates all brands with NULL or invalid embeddings
    - Adds proper error handling and logging
    
  2. Security
    - Function runs with invoker security
    - Uses public schema explicitly
*/

-- Create helper function to generate zero vector
CREATE OR REPLACE FUNCTION generate_zero_vector()
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT '[' || string_agg('0', ',') || ']'
  FROM generate_series(1, 1536);
$$;

-- Initialize all brand embeddings
DO $$
DECLARE
  v_zero_vector text;
  v_processed integer := 0;
  v_errors integer := 0;
  v_log_id uuid;
  v_brand record;
BEGIN
  -- Get zero vector
  SELECT generate_zero_vector() INTO v_zero_vector;
  
  -- Create processing log
  INSERT INTO embedding_processing_logs (started_at)
  VALUES (NOW())
  RETURNING id INTO v_log_id;

  -- Process each brand needing initialization
  FOR v_brand IN 
    SELECT id 
    FROM brands 
    WHERE embedding IS NULL 
       OR embedding = '[]'::vector(1536)
       OR embedding = '{}'::vector(1536)
       OR embedding = '[0,0,0]'::vector(1536)
  LOOP
    BEGIN
      -- Initialize with proper zero vector
      UPDATE brands
      SET embedding = v_zero_vector::vector(1536),
          updated_at = NOW()
      WHERE id = v_brand.id;
      
      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      
      -- Log error
      UPDATE embedding_processing_logs
      SET error_details = array_append(error_details, 
        format('Error initializing brand %s: %s', v_brand.id, SQLERRM))
      WHERE id = v_log_id;
    END;
  END LOOP;

  -- Update log with results
  UPDATE embedding_processing_logs
  SET completed_at = NOW(),
      brands_processed = v_processed,
      errors_count = v_errors
  WHERE id = v_log_id;

  RAISE NOTICE 'Embedding initialization complete. Processed: %, Errors: %', 
    v_processed, v_errors;
END;
$$;