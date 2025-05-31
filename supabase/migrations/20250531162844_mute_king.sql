/*
  # Add vector search capabilities
  
  1. New Columns
    - `embedding` (vector) - Stores the OpenAI embedding vector
    - `last_embedded_at` (timestamptz) - Tracks when embedding was last updated
  
  2. Indexes
    - Creates IVFFlat index on embedding column for fast similarity search
*/

-- Enable vector extension if not enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE brands ADD COLUMN embedding vector(1536);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brands' AND column_name = 'last_embedded_at'
  ) THEN
    ALTER TABLE brands ADD COLUMN last_embedded_at timestamptz;
  END IF;
END $$;

-- Create embedding processing logs table
CREATE TABLE IF NOT EXISTS embedding_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  brands_processed integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  error_details text[]
);

-- Create IVFFlat index for fast similarity search
CREATE INDEX IF NOT EXISTS brands_embedding_idx ON brands 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = '100');

-- Create function to process brand embeddings in batches
CREATE OR REPLACE FUNCTION process_brand_embeddings()
RETURNS json AS $$
DECLARE
  log_id uuid;
  processed integer := 0;
  errors integer := 0;
  error_list text[] := ARRAY[]::text[];
  brand_record record;
BEGIN
  -- Create log entry
  INSERT INTO embedding_processing_logs (started_at)
  VALUES (now())
  RETURNING id INTO log_id;

  -- Process brands needing embeddings
  FOR brand_record IN 
    SELECT id, name 
    FROM brands 
    WHERE embedding IS NULL 
       OR last_embedded_at < now() - interval '24 hours'
  LOOP
    BEGIN
      -- Queue brand for embedding generation
      PERFORM pg_notify(
        'generate_embedding',
        json_build_object(
          'brand_id', brand_record.id,
          'log_id', log_id
        )::text
      );
      
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      errors := errors + 1;
      error_list := array_append(
        error_list, 
        format('Failed to process brand %s: %s', brand_record.name, SQLERRM)
      );
    END;
  END LOOP;

  -- Update log entry
  UPDATE embedding_processing_logs
  SET 
    completed_at = now(),
    brands_processed = processed,
    errors_count = errors,
    error_details = error_list
  WHERE id = log_id;

  RETURN json_build_object(
    'processed', processed,
    'errors', errors,
    'log_id', log_id
  );
END;
$$ LANGUAGE plpgsql;