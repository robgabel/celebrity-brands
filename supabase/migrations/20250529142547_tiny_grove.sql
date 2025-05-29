/*
  # Initialize Brand Embeddings
  
  1. Changes
    - Creates helper function to generate zero vector array
    - Initializes NULL or empty brand embeddings with proper zero vectors
    
  2. Error Handling
    - Logs all processing attempts and errors
    - Maintains audit trail of initialization process
*/

-- Create helper function to generate zero vector array
CREATE OR REPLACE FUNCTION generate_zero_vector()
RETURNS float8[]
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT array_agg(0::float8)
  FROM generate_series(1, 1536);
$$;

-- Initialize all brand embeddings
DO $$
DECLARE
  v_zero_vector float8[];
  v_processed integer := 0;
  v_errors integer := 0;
  v_log_id uuid;
  v_brand record;
BEGIN
  -- Get zero vector array
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