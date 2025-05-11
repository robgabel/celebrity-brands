/*
  # Add compute rankings function and logging

  1. Changes
    - Creates compute_brand_rankings function
    - Adds logging to metrics_scheduler_logs table
    - Sets up function to call compute-rankings edge function

  2. Security
    - Maintains existing RLS policies
    - Only allows admin access to logs
*/

-- Create function to compute rankings
CREATE OR REPLACE FUNCTION compute_brand_rankings()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
BEGIN
    -- Log job start
    INSERT INTO metrics_scheduler_logs (job_name, status)
    VALUES ('compute_brand_rankings', 'running')
    RETURNING id INTO v_job_id;
    
    -- Call the edge function
    PERFORM
        net.http_post(
            url := current_setting('app.settings.site_url') || '/functions/v1/compute-rankings',
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