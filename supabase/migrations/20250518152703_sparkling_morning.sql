/*
  # Update embedding queue function security

  Updates the queue_brand_embedding function to use SECURITY INVOKER instead of SECURITY DEFINER
  to ensure proper permissions are maintained when queueing brand embeddings.
*/

CREATE OR REPLACE FUNCTION queue_brand_embedding(p_brand_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_brand_text text;
  v_result json;
BEGIN
  -- Get the brand text for embedding
  SELECT 
    name || ' ' || 
    COALESCE(creators, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(product_category, '')
  INTO v_brand_text
  FROM brands
  WHERE id = p_brand_id;

  IF v_brand_text IS NULL THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  -- Insert into embedding queue
  INSERT INTO embedding_queue (
    record_id,
    text_for_embedding,
    status
  ) VALUES (
    p_brand_id,
    v_brand_text,
    'pending'
  )
  ON CONFLICT (record_id) DO UPDATE
  SET 
    text_for_embedding = EXCLUDED.text_for_embedding,
    status = 'pending',
    error = NULL,
    processed_at = NULL,
    updated_at = now();

  SELECT json_build_object(
    'success', true,
    'message', 'Brand queued for embedding update'
  ) INTO v_result;

  RETURN v_result;
END;
$$;