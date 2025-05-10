/*
  # Create short_urls table

  1. New Tables
    - `short_urls`
      - `id` (text, primary key) - The short code
      - `url` (text) - The original URL
      - `created_at` (timestamp)
      - `clicks` (integer) - Click counter
      - `user_id` (uuid) - Optional creator reference

  2. Security
    - Enable RLS
    - Allow public access for redirects
    - Allow authenticated users to create and manage their URLs
*/

-- Create the short_urls table
CREATE TABLE IF NOT EXISTS public.short_urls (
  id text PRIMARY KEY,
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  clicks integer DEFAULT 0,
  user_id uuid REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_short_urls_user_id ON public.short_urls(user_id);
CREATE INDEX IF NOT EXISTS idx_short_urls_created_at ON public.short_urls(created_at);

-- Enable RLS
ALTER TABLE public.short_urls ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access"
  ON public.short_urls
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to create URLs"
  ON public.short_urls
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

CREATE POLICY "Allow users to manage their own URLs"
  ON public.short_urls
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);