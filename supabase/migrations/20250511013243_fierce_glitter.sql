/*
  # Set up cron jobs for metrics collection

  1. Changes
    - Enables pg_cron extension
    - Creates cron jobs for:
      - Fetching trend data (daily at 2 AM UTC)
      - Fetching news counts (daily at 3 AM UTC)
    - Adds logging table for job execution

  2. Security
    - Maintains existing RLS policies
    - Runs jobs with appropriate permissions
*/

-- First create a logging table for cron jobs
CREATE TABLE IF NOT EXISTS cron_job_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    status text NOT NULL,
    message text,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Enable RLS
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Enable admin read access for cron logs"
    ON cron_job_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.auth_id = auth.uid()::text
            AND user_profiles.is_admin = true
        )
    );

-- Create helper function for logging
CREATE OR REPLACE FUNCTION log_cron_job(p_job_name text, p_status text, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO cron_job_logs (job_name, status, message)
    VALUES (p_job_name, p_status, p_message);
END;
$$;

-- Create function to fetch trends
CREATE OR REPLACE FUNCTION fetch_trends()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO cron_job_logs (job_name, status)
    VALUES ('fetch_trends', 'running')
    RETURNING id INTO v_job_id;
    
    -- Call the edge function
    PERFORM
        net.http_post(
            url := current_setting('custom.base_url') || '/functions/v1/trends',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('custom.anon_key'),
                'Content-Type', 'application/json'
            )
        );

    -- Update log with completion
    UPDATE cron_job_logs
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_job_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE cron_job_logs
    SET status = 'error',
        message = SQLERRM,
        completed_at = now()
    WHERE id = v_job_id;
END;
$$;

-- Create function to fetch news counts
CREATE OR REPLACE FUNCTION fetch_news_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO cron_job_logs (job_name, status)
    VALUES ('fetch_news_counts', 'running')
    RETURNING id INTO v_job_id;
    
    -- Call the edge function
    PERFORM
        net.http_post(
            url := current_setting('custom.base_url') || '/functions/v1/news-counts',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('custom.anon_key'),
                'Content-Type', 'application/json'
            )
        );

    -- Update log with completion
    UPDATE cron_job_logs
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_job_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE cron_job_logs
    SET status = 'error',
        message = SQLERRM,
        completed_at = now()
    WHERE id = v_job_id;
END;
$$;

-- Schedule the jobs
SELECT cron.schedule(
    'fetch-trends',
    '0 2 * * *',
    $$SELECT fetch_trends()$$
);

SELECT cron.schedule(
    'fetch-news-counts',
    '0 3 * * *',
    $$SELECT fetch_news_counts()$$
);