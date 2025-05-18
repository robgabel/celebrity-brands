/*
  # Fix brand analysis and embedding queue

  1. Changes
    - Add status tracking for brand analysis
    - Add timeout handling
    - Add error tracking
    - Add cleanup for stale records

  2. New Tables
    - brand_analysis_status
      - Tracks the status of brand analysis
      - Stores error messages and timestamps
      - Handles timeouts and retries

  3. Functions
    - track_brand_analysis(): Tracks analysis progress
    - cleanup_stale_analysis(): Removes old records
*/

-- Create brand analysis status table
CREATE TABLE IF NOT EXISTS brand_analysis_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint REFERENCES brands(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error text,
  retry_count int DEFAULT 0,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'error', 'timeout'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_brand_analysis_status_brand_id ON brand_analysis_status(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_status_status ON brand_analysis_status(status);
CREATE INDEX IF NOT EXISTS idx_brand_analysis_status_started_at ON brand_analysis_status(started_at);

-- Function to track brand analysis
CREATE OR REPLACE FUNCTION track_brand_analysis(
  p_brand_id bigint,
  p_status text,
  p_error text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Insert or update status
  INSERT INTO brand_analysis_status (
    brand_id,
    status,
    error,
    completed_at
  )
  VALUES (
    p_brand_id,
    p_status,
    p_error,
    CASE WHEN p_status IN ('completed', 'error', 'timeout') THEN now() ELSE NULL END
  )
  ON CONFLICT (brand_id) DO UPDATE
  SET
    status = EXCLUDED.status,
    error = EXCLUDED.error,
    completed_at = EXCLUDED.completed_at,
    retry_count = CASE 
      WHEN brand_analysis_status.status = 'error' THEN brand_analysis_status.retry_count + 1
      ELSE brand_analysis_status.retry_count
    END;

  SELECT json_build_object(
    'success', true,
    'status', p_status,
    'brand_id', p_brand_id
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to cleanup stale analysis records
CREATE OR REPLACE FUNCTION cleanup_stale_analysis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark old pending/processing records as timeout
  UPDATE brand_analysis_status
  SET 
    status = 'timeout',
    completed_at = now(),
    error = 'Analysis timed out'
  WHERE 
    status IN ('pending', 'processing')
    AND started_at < now() - interval '5 minutes';

  -- Delete completed records older than 24 hours
  DELETE FROM brand_analysis_status
  WHERE 
    status IN ('completed', 'error', 'timeout')
    AND completed_at < now() - interval '24 hours';
END;
$$;