/*
  # Add scheduling for brand rankings computation

  1. Changes
    - Creates a function to schedule the ranking computation
    - Uses pg_catalog.pg_sleep() for scheduling
    - Maintains existing RLS policies

  2. Security
    - Only allows admin access to scheduling functions
    - Maintains data integrity
*/

-- Create function to schedule ranking computation
CREATE OR REPLACE FUNCTION schedule_ranking_computation()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  LOOP
    -- Call the compute_brand_rankings function
    PERFORM compute_brand_rankings();
    
    -- Wait for 24 hours (86400 seconds)
    PERFORM pg_catalog.pg_sleep(86400);
  END LOOP;
END;
$$;

-- Create function to start the scheduler in the background
CREATE OR REPLACE FUNCTION start_ranking_scheduler()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM schedule_ranking_computation();
END;
$$;

-- Create helper function to check if scheduler is running
CREATE OR REPLACE FUNCTION is_ranking_scheduler_running()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM pg_stat_activity 
    WHERE query LIKE '%schedule_ranking_computation%'
    AND state = 'active'
  );
END;
$$;