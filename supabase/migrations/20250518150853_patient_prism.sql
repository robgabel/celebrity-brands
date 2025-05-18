/*
  # Brand Embeddings Update System

  1. Tables
    - Modifies embedding_queue table to add indexes and constraints
    - Adds updated_at trigger

  2. Functions
    - Adds queue_brand_embedding function for Edge Function use
    - Updates existing functions to use proper security

  3. Triggers
    - Adds updated_at column trigger
*/

-- Add indexes to embedding_queue
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_created_at ON embedding_queue(created_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embedding_queue_updated_at
  BEFORE UPDATE ON embedding_queue
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function for Edge Function to process queue
CREATE OR REPLACE FUNCTION queue_brand_embedding(p_brand_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_text text;
  v_result json;
BEGIN
  -- Get text for embedding
  SELECT 
    COALESCE(description, '') || ' ' || 
    COALESCE(name, '') || ' ' || 
    COALESCE(creators, '') || ' ' ||
    COALESCE(product_category, '')
  INTO v_brand_text
  FROM brands
  WHERE id = p_brand_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Brand not found'
    );
  END IF;

  -- Insert or update queue entry
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
    processed_at = NULL,
    error = NULL,
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'brand_id', p_brand_id,
    'queue_status', 'pending'
  );
END;
$$;