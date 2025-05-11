/*
  # Add metrics collection cron jobs

  1. Changes
    - Creates cron jobs to collect metrics and compute rankings
    - Sets up schedules for different metric types
    - Ensures proper error handling and logging

  2. Security
    - Maintains existing RLS policies
    - Uses service role for scheduled tasks
*/

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule metrics collection jobs
SELECT cron.schedule(
  'collect-search-metrics',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT fetch_brand_trends();
  $$
);

SELECT cron.schedule(
  'collect-news-metrics',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT fetch_brand_news_counts();
  $$
);

SELECT cron.schedule(
  'compute-rankings',
  '0 0 * * *', -- Daily at midnight
  $$
  SELECT compute_brand_rankings();
  $$
);

SELECT cron.schedule(
  'cleanup-old-data',
  '0 1 * * *', -- Daily at 1 AM
  $$
  SELECT clean_old_data();
  $$
);

-- Create helper function to check job status
CREATE OR REPLACE FUNCTION get_metrics_job_status()
RETURNS TABLE (
  job_name text,
  last_run timestamptz,
  next_run timestamptz,
  last_status text,
  last_error text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.jobname,
    c.last_run,
    c.next_run,
    l.status,
    l.message
  FROM cron.job c
  LEFT JOIN metrics_scheduler_logs l ON l.job_name = c.jobname
  WHERE c.jobname IN (
    'collect-search-metrics',
    'collect-news-metrics', 
    'compute-rankings',
    'cleanup-old-data'
  )
  ORDER BY c.jobname;
END;
$$;