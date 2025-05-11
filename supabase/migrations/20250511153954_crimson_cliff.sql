/*
  # Update metrics collection cron job

  1. Changes
    - Replace trends function with wikipedia-pageviews
    - Maintain existing schedule and error handling
    - Update job name for clarity

  2. Security
    - Maintains existing RLS policies
*/

-- Drop old job
SELECT cron.unschedule('collect-search-metrics');

-- Schedule new job with wikipedia pageviews
SELECT cron.schedule(
  'collect-pageview-metrics',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.site_url') || '/functions/v1/wikipedia-pageviews',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'),
        'Content-Type', 'application/json'
      )
    );
  $$
);