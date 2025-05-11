/*
  # Create news_articles table for caching

  1. New Tables
    - `news_articles`
      - `id` (uuid, primary key)
      - `brand_id` (bigint, foreign key to brands)
      - `title` (text)
      - `url` (text)
      - `description` (text)
      - `image_url` (text, nullable)
      - `published_at` (timestamptz)
      - `source` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public read access
    - Add policies for system updates
*/

CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint REFERENCES public.brands(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  image_url text,
  published_at timestamptz NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_brand_id ON public.news_articles(brand_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON public.news_articles(published_at DESC);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable public read access for news articles"
  ON public.news_articles
  FOR SELECT
  TO public
  USING (true);

-- Add function to clean old articles
CREATE OR REPLACE FUNCTION clean_old_news_articles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.news_articles
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;