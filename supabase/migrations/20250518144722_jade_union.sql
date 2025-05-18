/*
  # Update brand embeddings function

  1. New Functions
    - update_brand_embedding: Updates brand embeddings without admin check
    - handle_brand_embedding_update: Trigger function to update embeddings on brand changes

  2. Changes
    - Removed admin check from embedding update function
    - Added trigger for automatic embedding updates
*/

-- Function to update brand embeddings
CREATE OR REPLACE FUNCTION update_brand_embedding(brand_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- Function to handle brand updates
CREATE OR REPLACE FUNCTION handle_brand_embedding_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Queue embedding update when relevant fields change
  IF (
    NEW.name != OLD.name OR
    NEW.description != OLD.description OR
    NEW.creators != OLD.creators OR
    NEW.product_category != OLD.product_category
  ) THEN
    PERFORM update_brand_embedding(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic embedding updates
DROP TRIGGER IF EXISTS trigger_update_brand_embedding ON brands;
CREATE TRIGGER trigger_update_brand_embedding
  AFTER UPDATE OF name, description, creators, product_category
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_embedding_update();