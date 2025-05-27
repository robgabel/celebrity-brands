/*
  # Fix queue_brand_embedding function security context

  1. Changes
    - Change SECURITY DEFINER to SECURITY INVOKER for queue_brand_embedding function
    - This allows the function to run with the privileges of the calling user
    - Maintains proper security context for embedding updates
*/

CREATE OR REPLACE FUNCTION queue_brand_embedding(p_brand_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Validate brand exists
  IF NOT EXISTS (SELECT 1 FROM brands WHERE id = p_brand_id) THEN
    RAISE EXCEPTION 'Brand not found with ID %', p_brand_id;
  END IF;

  -- Queue the brand for embedding processing
  UPDATE brands
  SET embedding = NULL,
      updated_at = NOW()
  WHERE id = p_brand_id
  RETURNING json_build_object(
    'success', true,
    'message', 'Brand queued for embedding update',
    'brand_id', id
  ) INTO v_result;

  RETURN v_result;
END;
$$;