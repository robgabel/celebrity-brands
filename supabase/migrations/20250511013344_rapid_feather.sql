/*
  # Create metrics scheduler

  1. Changes
    - Creates a metrics_scheduler table to track job runs
    - Adds functions to handle metric collection
    - Sets up error handling and logging
    - Uses Supabase's built-in scheduler

  2. Security
    - Enables RLS
    - Only allows admin access to scheduler logs
*/

-- Create metrics scheduler log table
CREATE TABLE IF NOT EXISTS public.metrics_scheduler_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name text NOT NULL,
    status text NOT NULL,
    message text,
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Enable RLS
ALTER TABLE metrics_scheduler_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Enable admin read access for scheduler logs"
    ON metrics_scheduler_logs
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
CREATE OR REPLACE FUNCTION log_scheduler_job(p_job_name text, p_status text, p_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO metrics_scheduler_logs (job_name, status, message)
    VALUES (p_job_name, p_status, p_message);
END;
$$;

-- Create function to fetch trends
CREATE OR REPLACE FUNCTION fetch_brand_trends()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO metrics_scheduler_logs (job_name, status)
    VALUES ('fetch_brand_trends', 'running')
    RETURNING id INTO v_job_id;
    
    -- Call the edge function
    PERFORM
        net.http_post(
            url := current_setting('app.settings.site_url') || '/functions/v1/trends',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
                'Content-Type', 'application/json'
            )
        );

    -- Update log with completion
    UPDATE metrics_scheduler_logs
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_job_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE metrics_scheduler_logs
    SET status = 'error',
        message = SQLERRM,
        completed_at = now()
    WHERE id = v_job_id;
END;
$$;

-- Create function to fetch news counts
CREATE OR REPLACE FUNCTION fetch_brand_news_counts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO metrics_scheduler_logs (job_name, status)
    VALUES ('fetch_brand_news_counts', 'running')
    RETURNING id INTO v_job_id;
    
    -- Call the edge function
    PERFORM
        net.http_post(
            url := current_setting('app.settings.site_url') || '/functions/v1/news-counts',
            headers := jsonb_build_object(
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
                'Content-Type', 'application/json'
            )
        );

    -- Update log with completion
    UPDATE metrics_scheduler_logs
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_job_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE metrics_scheduler_logs
    SET status = 'error',
        message = SQLERRM,
        completed_at = now()
    WHERE id = v_job_id;
END;
$$;

-- Create function to clean old data
CREATE OR REPLACE FUNCTION clean_old_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO metrics_scheduler_logs (job_name, status)
    VALUES ('clean_old_data', 'running')
    RETURNING id INTO v_job_id;

    -- Clean old metrics
    PERFORM clean_old_metrics();
    
    -- Clean old news articles
    PERFORM clean_old_news_articles();

    -- Clean old logs (keep last 30 days)
    DELETE FROM metrics_scheduler_logs
    WHERE completed_at < now() - interval '30 days';

    -- Update log with completion
    UPDATE metrics_scheduler_logs
    SET status = 'completed',
        completed_at = now()
    WHERE id = v_job_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    UPDATE metrics_scheduler_logs
    SET status = 'error',
        message = SQLERRM,
        completed_at = now()
    WHERE id = v_job_id;
END;
$$;