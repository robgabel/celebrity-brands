/*
  # Brand Embedding System

  1. Tables
    - embedding_queue: Tracks pending embedding updates
      - id (uuid, primary key)
      - record_id (bigint, unique)
      - text_for_embedding (text)
      - status (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)
      - processed_at (timestamptz)
      - error (text)

  2. Functions
    - update_brand_embedding: Queues a brand for embedding update
    - handle_brand_embedding_update: Trigger function for automatic updates

  3. Triggers
    - trigger_update_brand_embedding: Monitors brand changes
*/

-- Create embedding queue table if it doesn't exist
CREATE TABLE IF NOT EXISTS embedding_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id bigint UNIQUE NOT NULL,
  text_for_embedding text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- Drop existing functions to ensure clean slate
DROP FUNCTION IF EXISTS update_brand_embedding(bigint);
DROP FUNCTION IF EXISTS handle_brand_embedding_update();

-- Function to update brand embeddings
CREATE FUNCTION update_brand_embedding(brand_id bigint)
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
CREATE FUNCTION handle_brand_embedding_update()
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_brand_embedding ON brands;

-- Create trigger for automatic embedding updates
CREATE TRIGGER trigger_update_brand_embedding
  AFTER UPDATE OF name, description, creators, product_category
  ON brands
  FOR EACH ROW
  EXECUTE FUNCTION handle_brand_embedding_update();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE embedding_queue TO postgres, service_role;
GRANT SELECT ON TABLE embedding_queue TO anon, authenticated;