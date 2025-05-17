-- Function to update brand embeddings
CREATE OR REPLACE FUNCTION update_brand_embedding(brand_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  brand_text text;
BEGIN
  -- Concatenate relevant brand fields for embedding
  SELECT
    name || ' ' ||
    COALESCE(creators, '') || ' ' ||
    COALESCE(product_category, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(type_of_influencer, '')
  INTO brand_text
  FROM brands
  WHERE id = brand_id;

  -- Store the text for embedding generation
  INSERT INTO embedding_queue (record_id, text_for_embedding, status)
  VALUES (brand_id, brand_text, 'pending')
  ON CONFLICT (record_id) 
  DO UPDATE SET 
    text_for_embedding = EXCLUDED.text_for_embedding,
    status = 'pending',
    updated_at = now();
END;
$$;

-- Create embedding queue table
CREATE TABLE IF NOT EXISTS embedding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id bigint NOT NULL,
  text_for_embedding text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text,
  UNIQUE(record_id)
);

-- Add trigger to update embeddings when brand is modified
CREATE OR REPLACE FUNCTION trigger_update_brand_embedding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update embedding if relevant fields changed
  IF (
    NEW.name != OLD.name OR
    NEW.creators != OLD.creators OR
    NEW.product_category != OLD.product_category OR
    NEW.description != OLD.description OR
    NEW.type_of_influencer != OLD.type_of_influencer
  ) THEN
    PERFORM update_brand_embedding(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS update_brand_embedding_trigger ON brands;
CREATE TRIGGER update_brand_embedding_trigger
  AFTER UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_brand_embedding();