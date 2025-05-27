/*
  # Fix vector initialization for brand embeddings

  1. Changes
    - Drop existing function to avoid return type conflicts
    - Create new version of process_brand_embeddings that properly initializes vector field
    - Use array syntax for vector initialization
*/

-- Drop the function if it exists
DROP FUNCTION IF EXISTS process_brand_embeddings();

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
BEGIN
  -- Create a log entry
  INSERT INTO embedding_processing_logs (started_at)
  VALUES (NOW())
  RETURNING id INTO v_log_id;

  -- Process each brand
  FOR v_brand IN 
    SELECT id 
    FROM brands 
    WHERE embedding IS NULL
    OR embedding = '[0,0,0]'::vector(1536)
  LOOP
    BEGIN
      -- Queue the brand for embedding update by setting embedding to initial vector
      UPDATE brands
      SET embedding = '[0,0,0]'::vector(1536),
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