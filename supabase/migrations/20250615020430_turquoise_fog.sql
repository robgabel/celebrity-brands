/*
  # Add RLS Policies - Noisy Lake

  1. Security Policies
    - Add comprehensive RLS policies for all tables
    - Ensure proper access control for authenticated and public users
    - Admin-specific policies for management functions

  2. Policy Structure
    - Public read access for approved content
    - Authenticated user access for personal data
    - Admin access for management operations
*/

-- Drop all existing policies to start fresh and avoid conflicts
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all existing policies on all tables
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Brands table policies
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

-- User profiles policies
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

-- Favorite brands policies
CREATE POLICY "favorite_brands_crud_own"
  ON favorite_brands
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "goals_crud_own"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Brand comments policies
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
CREATE POLICY "brand_reports_crud_own"
  ON brand_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Brand suggestions policies
CREATE POLICY "brand_suggestions_crud_own"
  ON brand_suggestions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- News articles policies
CREATE POLICY "news_articles_select_public"
  ON news_articles
  FOR SELECT
  TO public
  USING (true);

-- News feedback policies
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

-- Short URLs policies
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

-- System config policies
CREATE POLICY "system_config_select_public"
  ON system_config
  FOR SELECT
  TO public
  USING (true);

-- Cron job logs policies
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

-- Auth audit log policies (admin only)
CREATE POLICY "auth_audit_log_admin_select"
  ON auth_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  );

-- Embedding processing logs policies (admin only)
CREATE POLICY "embedding_processing_logs_admin_select"
  ON embedding_processing_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  );