/*
  # Update fetch_brand_trends function

  1. Changes
    - Replace trends API call with Wikipedia pageviews
    - Update function name for clarity
    - Maintain error handling and logging

  2. Security
    - Maintains existing RLS policies
*/

-- Drop old function
DROP FUNCTION IF EXISTS fetch_brand_trends();

-- Create new function
CREATE OR REPLACE FUNCTION fetch_brand_pageviews()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id uuid;
    v_brand RECORD;
BEGIN
    -- Log job start
    INSERT INTO metrics_scheduler_logs (job_name, status)
    VALUES ('fetch_brand_pageviews', 'running')
    RETURNING id INTO v_job_id;
    
    -- Process each approved brand
    FOR v_brand IN 
        SELECT id, name 
        FROM brands 
        WHERE approval_status = 'approved'
    LOOP
        -- Call the edge function for each brand
        PERFORM
            net.http_post(
                url := current_setting('app.settings.site_url') || '/functions/v1/wikipedia-pageviews',
                headers := jsonb_build_object(
                    'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
                    'Content-Type', 'application/json'
                ),
                body := jsonb_build_object('query', v_brand.name)
            );
            
        -- Add delay to avoid rate limits
        PERFORM pg_sleep(1);
    END LOOP;

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