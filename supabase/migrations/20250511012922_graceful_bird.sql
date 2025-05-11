/*
  # Add brand metrics and rankings tables

  1. New Tables
    - brand_metrics
      - Stores various metrics like search interest, domain rank, etc.
      - Includes validation for metric types
      - Supports time-series data collection
    
    - brand_rankings
      - Stores overall brand rankings and scores
      - Includes trend percentage tracking
      - Maintains historical ranking data

  2. Security
    - Enable RLS on both tables
    - Public read access
    - Admin-only write access
*/

-- Create brand_metrics table
CREATE TABLE IF NOT EXISTS public.brand_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint REFERENCES public.brands(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for brand_metrics
CREATE INDEX IF NOT EXISTS idx_brand_metrics_brand_id ON public.brand_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_metrics_type ON public.brand_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_brand_metrics_collected_at ON public.brand_metrics(collected_at DESC);

-- Enable RLS on brand_metrics
ALTER TABLE public.brand_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_metrics
CREATE POLICY "Enable public read access for metrics"
  ON public.brand_metrics
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable admin write access for metrics"
  ON public.brand_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = auth.uid()::text
      AND user_profiles.is_admin = true
    )
  );

-- Create brand_rankings table
CREATE TABLE IF NOT EXISTS public.brand_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint REFERENCES public.brands(id) ON DELETE CASCADE,
  ranking_score numeric NOT NULL,
  rank integer NOT NULL,
  trend_pct numeric,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for brand_rankings
CREATE INDEX IF NOT EXISTS idx_brand_rankings_brand_id ON public.brand_rankings(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_rankings_rank ON public.brand_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_brand_rankings_computed_at ON public.brand_rankings(computed_at DESC);

-- Enable RLS on brand_rankings
ALTER TABLE public.brand_rankings ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_rankings
CREATE POLICY "Enable public read access for rankings"
  ON public.brand_rankings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable admin write access for rankings"
  ON public.brand_rankings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = auth.uid()::text
      AND user_profiles.is_admin = true
    )
  );

-- Add constraints for valid metric types
ALTER TABLE public.brand_metrics
ADD CONSTRAINT valid_metric_types
CHECK (metric_type IN (
  'search_interest',
  'domain_rank',
  'social_mentions',
  'news_mentions',
  'engagement_rate'
));

-- Add constraints for valid ranks and scores
ALTER TABLE public.brand_rankings
ADD CONSTRAINT valid_rank_range
CHECK (rank > 0);

ALTER TABLE public.brand_rankings
ADD CONSTRAINT valid_score_range
CHECK (ranking_score >= 0 AND ranking_score <= 100);

ALTER TABLE public.brand_rankings
ADD CONSTRAINT valid_trend_range
CHECK (trend_pct >= -100 AND trend_pct <= 100);

-- Add function to clean old metrics
CREATE OR REPLACE FUNCTION clean_old_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Keep only last 90 days of metrics
  DELETE FROM public.brand_metrics
  WHERE collected_at < NOW() - INTERVAL '90 days';
  
  -- Keep only last 30 days of rankings
  DELETE FROM public.brand_rankings
  WHERE computed_at < NOW() - INTERVAL '30 days';
END;
$$;