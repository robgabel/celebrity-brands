/*
  # Add batch embedding processing function
  
  1. Changes
    - Adds process_brand_embeddings() function to process embeddings in batches
    - Function returns JSON with processing results
    - Tracks progress in embedding_processing_logs table
*/

-- Drop the function if it exists to avoid return type conflicts
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
    OR embedding = '{}'::vector(1536)
  LOOP
    BEGIN
      -- Queue the brand for embedding update
      PERFORM queue_brand_embedding(v_brand.id);
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