/*
  # Fix Migration Conflicts and Ensure Idempotency

  This migration consolidates and fixes all conflicting policies and ensures
  idempotent operations for all database objects.

  ## Changes Made:
  1. Drop and recreate all conflicting policies with proper naming
  2. Ensure all tables have proper RLS enabled
  3. Create missing indexes with IF NOT EXISTS checks
  4. Fix any schema inconsistencies
  5. Ensure all operations are idempotent
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- BRANDS TABLE POLICY CLEANUP
-- =====================================================

-- Drop all existing conflicting policies on brands table
DO $$ 
BEGIN
  -- Drop all existing policies to start fresh
  DROP POLICY IF EXISTS "brands_select_public" ON brands;
  DROP POLICY IF EXISTS "brands_select_authenticated" ON brands;
  DROP POLICY IF EXISTS "brands_insert_authenticated" ON brands;
  DROP POLICY IF EXISTS "brands_update_admin" ON brands;
  DROP POLICY IF EXISTS "Enable public read access for brand stories" ON brands;
  DROP POLICY IF EXISTS "Public can read approved brands" ON brands;
  DROP POLICY IF EXISTS "Authenticated users can read all brands" ON brands;
  DROP POLICY IF EXISTS "Authenticated users can create brands" ON brands;
  DROP POLICY IF EXISTS "Admins can update brands" ON brands;
END $$;

-- Ensure RLS is enabled on brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create clean, non-conflicting policies for brands
CREATE POLICY "brands_select_public"
  ON brands
  FOR SELECT
  TO public
  USING (approval_status = 'approved');

CREATE POLICY "brands_select_authenticated"
  ON brands
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "brands_insert_authenticated"
  ON brands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "brands_update_admin"
  ON brands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  );

-- =====================================================
-- USER_PROFILES TABLE POLICY CLEANUP
-- =====================================================

-- Drop and recreate user_profiles policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
END $$;

-- Ensure RLS is enabled on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create clean policies for user_profiles
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = (auth.uid())::text);

CREATE POLICY "user_profiles_select_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth_id = (auth.uid())::text);

CREATE POLICY "user_profiles_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth_id = (auth.uid())::text)
  WITH CHECK (auth_id = (auth.uid())::text);

CREATE POLICY "user_profiles_admin_select_all"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    is_admin = true AND auth_id = (auth.uid())::text
  );

CREATE POLICY "user_profiles_admin_update_all"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_id = (auth.uid())::text
      AND up.is_admin = true
    )
  );

-- =====================================================
-- NEWS_FEEDBACK TABLE (IDEMPOTENT CREATION)
-- =====================================================

-- Create news_feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS news_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id bigint NOT NULL,
  news_article_url text NOT NULL,
  is_accurate boolean NOT NULL,
  feedback_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'news_feedback_user_id_fkey'
  ) THEN
    ALTER TABLE news_feedback 
    ADD CONSTRAINT news_feedback_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'news_feedback_brand_id_fkey'
  ) THEN
    ALTER TABLE news_feedback 
    ADD CONSTRAINT news_feedback_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on news_feedback
ALTER TABLE news_feedback ENABLE ROW LEVEL SECURITY;

-- Drop and recreate news_feedback policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create feedback" ON news_feedback;
  DROP POLICY IF EXISTS "Users can read own feedback" ON news_feedback;
END $$;

CREATE POLICY "news_feedback_insert_own"
  ON news_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "news_feedback_select_own"
  ON news_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- OTHER TABLES POLICY CLEANUP
-- =====================================================

-- Goals table policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create goals" ON goals;
  DROP POLICY IF EXISTS "Users can read own goals" ON goals;
  DROP POLICY IF EXISTS "Users can update own goals" ON goals;
  DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
END $$;

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_crud_own"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Favorite brands policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorite_brands;
END $$;

ALTER TABLE favorite_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorite_brands_crud_own"
  ON favorite_brands
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Brand comments policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON brand_comments;
  DROP POLICY IF EXISTS "Users can create comments" ON brand_comments;
END $$;

ALTER TABLE brand_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_comments_select_public"
  ON brand_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "brand_comments_insert_authenticated"
  ON brand_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Brand reports policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create reports" ON brand_reports;
  DROP POLICY IF EXISTS "Users can view their own reports" ON brand_reports;
END $$;

ALTER TABLE brand_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_reports_crud_own"
  ON brand_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Brand suggestions policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can create brand suggestions" ON brand_suggestions;
  DROP POLICY IF EXISTS "Users can view their own suggestions" ON brand_suggestions;
END $$;

ALTER TABLE brand_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_suggestions_crud_own"
  ON brand_suggestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- News articles policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable public read access for news articles" ON news_articles;
END $$;

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_articles_select_public"
  ON news_articles
  FOR SELECT
  TO public
  USING (true);

-- Short URLs policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access" ON short_urls;
  DROP POLICY IF EXISTS "Allow authenticated users to create URLs" ON short_urls;
  DROP POLICY IF EXISTS "Allow users to manage their own URLs" ON short_urls;
END $$;

ALTER TABLE short_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "short_urls_select_public"
  ON short_urls
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "short_urls_insert_authenticated"
  ON short_urls
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR (user_id IS NULL));

CREATE POLICY "short_urls_update_own"
  ON short_urls
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cron job logs policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable admin read access for cron logs" ON cron_job_logs;
END $$;

ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cron_job_logs_admin_select"
  ON cron_job_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  );

-- System config policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "select_policy" ON system_config;
END $$;

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_select_public"
  ON system_config
  FOR SELECT
  TO public
  USING (true);

-- =====================================================
-- CREATE MISSING INDEXES (IDEMPOTENT)
-- =====================================================

-- News feedback indexes
CREATE INDEX IF NOT EXISTS idx_news_feedback_user_id ON news_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_news_feedback_brand_id ON news_feedback(brand_id);
CREATE INDEX IF NOT EXISTS idx_news_feedback_url ON news_feedback(news_article_url);

-- Ensure all other indexes exist
CREATE INDEX IF NOT EXISTS idx_brands_embedding ON brands USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_brands_approval_status ON brands(approval_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON user_profiles(is_admin) WHERE is_admin = true;

-- =====================================================
-- FUNCTIONS AND TRIGGERS (IDEMPOTENT)
-- =====================================================

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace brand story update trigger function
CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.brand_story IS DISTINCT FROM NEW.brand_story THEN
    NEW.last_story_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ 
BEGIN
  -- Drop and recreate triggers to ensure they're correct
  DROP TRIGGER IF EXISTS handle_updated_at ON user_profiles;
  DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
  DROP TRIGGER IF EXISTS update_brand_story_timestamp ON brands;

  -- Create triggers
  CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

  CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

  CREATE TRIGGER update_brand_story_timestamp
    BEFORE UPDATE OF brand_story ON brands
    FOR EACH ROW EXECUTE FUNCTION handle_brand_story_update();
END $$;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Create or replace the next_brand_id function
CREATE OR REPLACE FUNCTION next_brand_id()
RETURNS bigint AS $$
DECLARE
  next_id bigint;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM brands;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the match_brands function for semantic search
CREATE OR REPLACE FUNCTION match_brands(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  name text,
  creators text,
  product_category text,
  description text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    brands.id,
    brands.name,
    brands.creators,
    brands.product_category,
    brands.description,
    1 - (brands.embedding <=> query_embedding) AS similarity
  FROM brands
  WHERE 
    brands.approval_status = 'approved'
    AND brands.embedding IS NOT NULL
    AND 1 - (brands.embedding <=> query_embedding) > match_threshold
  ORDER BY brands.embedding <=> query_embedding
  LIMIT match_count;
$$;