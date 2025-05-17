/*
  # Add news feedback table
  
  1. New Tables
    - `news_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `brand_id` (bigint, references brands)
      - `news_article_url` (text)
      - `is_accurate` (boolean)
      - `feedback_text` (text, optional)
      - `created_at` (timestamptz)
  
  2. Indexes
    - On user_id for filtering by user
    - On brand_id for filtering by brand
    - On news_article_url for grouping feedback
  
  3. Security
    - Enable RLS
    - Allow authenticated users to create feedback
    - Allow users to read their own feedback
*/

CREATE TABLE IF NOT EXISTS news_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id bigint NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  news_article_url text NOT NULL,
  is_accurate boolean NOT NULL,
  feedback_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_news_feedback_user_id ON news_feedback(user_id);
CREATE INDEX idx_news_feedback_brand_id ON news_feedback(brand_id);
CREATE INDEX idx_news_feedback_url ON news_feedback(news_article_url);

-- Enable RLS
ALTER TABLE news_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create feedback"
  ON news_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can read own feedback"
  ON news_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid()::uuid = user_id);