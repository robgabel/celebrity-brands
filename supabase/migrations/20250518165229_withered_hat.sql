/*
  # Brand Analysis Queue System

  1. New Tables
    - `brand_analysis_queue`
      - `id` (uuid, primary key)
      - `brand_id` (bigint, references brands)
      - `status` (text: pending, processing, completed, error)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `processed_at` (timestamptz)
      - `error` (text)
      - `retry_count` (integer)

  2. Functions
    - `queue_brand_analysis`: Adds a brand to the analysis queue
    - `process_analysis_queue`: Processes pending items in the queue
    - `cleanup_analysis_queue`: Removes old completed/error items

  3. Indexes
    - Status index for efficient queue processing
    - Created_at index for chronological processing
    - Brand_id index for lookups
*/

-- Create brand analysis queue table
CREATE TABLE IF NOT EXISTS brand_analysis_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint REFERENCES brands(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text,
  retry_count integer DEFAULT 0,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'error'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_brand_analysis_queue_status ON brand_analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_queue_created_at ON brand_analysis_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_queue_brand_id ON brand_analysis_queue(brand_id);

-- Add updated_at trigger
CREATE TRIGGER update_brand_analysis_queue_updated_at
  BEFORE UPDATE ON brand_analysis_queue
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to queue brand for analysis
CREATE OR REPLACE FUNCTION queue_brand_analysis(p_brand_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Insert into queue
  INSERT INTO brand_analysis_queue (
    brand_id,
    status
  ) VALUES (
    p_brand_id,
    'pending'
  )
  ON CONFLICT (brand_id) DO UPDATE
  SET 
    status = 'pending',
    processed_at = NULL,
    error = NULL,
    retry_count = 0,
    updated_at = now();

  -- Also insert into brand_analysis_status for tracking
  INSERT INTO brand_analysis_status (
    brand_id,
    status
  ) VALUES (
    p_brand_id,
    'pending'
  )
  ON CONFLICT (brand_id) DO UPDATE
  SET
    status = 'pending',
    error = NULL,
    completed_at = NULL;

  SELECT json_build_object(
    'success', true,
    'brand_id', p_brand_id,
    'status', 'pending'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to cleanup old queue items
CREATE OR REPLACE FUNCTION cleanup_analysis_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete completed items older than 24 hours
  DELETE FROM brand_analysis_queue
  WHERE 
    status IN ('completed', 'error')
    AND processed_at < now() - interval '24 hours';

  -- Mark stale processing items as error
  UPDATE brand_analysis_queue
  SET 
    status = 'error',
    error = 'Processing timed out',
    processed_at = now()
  WHERE 
    status = 'processing'
    AND updated_at < now() - interval '5 minutes';
END;
$$;