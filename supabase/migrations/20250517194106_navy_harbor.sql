/*
  # Add function for manual embedding updates
  
  1. New Function
    - `update_brand_embedding_manual(brand_id bigint)`
    - Allows admins to manually trigger embedding updates for a single brand
  
  2. Security
    - Function can only be executed by authenticated users with admin privileges
*/

CREATE OR REPLACE FUNCTION update_brand_embedding_manual(brand_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE auth_id = auth.uid()::text 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only administrators can update embeddings manually';
  END IF;

  -- Insert into embedding queue
  INSERT INTO embedding_queue (
    record_id,
    text_for_embedding,
    status
  )
  SELECT 
    id as record_id,
    COALESCE(description, '') || ' ' || 
    COALESCE(name, '') || ' ' || 
    COALESCE(creators, '') || ' ' ||
    COALESCE(product_category, '') as text_for_embedding,
    'pending' as status
  FROM brands
  WHERE id = brand_id
  ON CONFLICT (record_id) DO UPDATE
  SET 
    text_for_embedding = EXCLUDED.text_for_embedding,
    status = 'pending',
    processed_at = NULL,
    error = NULL;

  RETURN true;
END;
$$;