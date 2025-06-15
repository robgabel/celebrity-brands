/*
  # Initial Database Setup - Azure Voice

  1. New Tables
    - `brands` - Core brand information table
    - `user_profiles` - Extended user profile data
    - `favorite_brands` - User favorite brands tracking
    - `goals` - User goals and objectives
    - `brand_comments` - Comments on brands
    - `brand_reports` - Brand issue reports
    - `brand_suggestions` - User brand suggestions
    - `news_articles` - News articles related to brands
    - `short_urls` - URL shortening service
    - `system_config` - System configuration
    - `cron_job_logs` - Background job logging
    - `auth_audit_log` - Authentication audit trail
    - `embedding_processing_logs` - AI embedding processing logs

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Create necessary indexes for performance

  3. Extensions
    - Enable uuid-ossp for UUID generation
    - Enable vector extension for AI embeddings
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create custom types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_type') THEN
    CREATE TYPE goal_type AS ENUM ('research', 'contact', 'investment', 'collaboration', 'other');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_method') THEN
    CREATE DOMAIN http_method AS text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE DOMAIN content_type AS text CHECK (VALUE ~ '^\\S+\\/\\S+');
  END IF;
END $$;

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  creators text NOT NULL,
  product_category text,
  description text,
  year_founded integer,
  year_discontinued integer,
  brand_collab boolean DEFAULT false NOT NULL,
  type_of_influencer text,
  logo_url text,
  social_links jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  homepage_url text,
  approval_status text DEFAULT 'pending' NOT NULL,
  brand_story jsonb,
  last_story_update timestamptz,
  embedding vector(1536),
  wikipedia_url text,
  last_embedded_at timestamptz,
  CONSTRAINT valid_approval_status CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  CONSTRAINT valid_founder_types CHECK (type_of_influencer IS NULL OR type_of_influencer = ANY (ARRAY[
    'Actor/Celebrity Influencer', 'Actor/Film Producer', 'Actor/Writer', 'Actress/Entrepreneur',
    'Actress/Influencer', 'Actress/Producer', 'Actress/TV Personality', 'Adventure/YouTube Influencer',
    'Animal/YouTuber', 'Athlete/Influencer', 'Beauty Influencer', 'Beauty YouTuber',
    'Beauty/LGBTQ+ Influencer', 'Beauty/Lifestyle YouTuber', 'Beauty/Nail YouTuber',
    'Beauty/YouTube Influencer', 'Blogger-Turned-Entrepreneur', 'Celebrity Hairstylist/Influencer',
    'Chef/TV Personality', 'Chef/TV Personality/Influencer', 'Comedy YouTubers',
    'Comedy/YouTube Influencer', 'Content Creator', 'DIY YouTubers', 'DIY/YouTube Influencer',
    'Dancer/YouTube Influencer', 'Esports/YouTuber', 'Family/Gaming YouTubers',
    'Family/Hair Tutorial YouTuber', 'Fashion Blogger/Influencer', 'Fashion Influencer',
    'Fashion/Beauty YouTuber', 'Fashion/Parenting Influencer', 'Fashion/YouTube Influencer',
    'Fitness Athlete/Influencer', 'Fitness Influencer', 'Food Blogger/Influencer',
    'Food Blogger/YouTuber', 'Food Influencer', 'Food/Instagram Influencer',
    'Food/Nutrition YouTuber', 'Former Pro Player/Streamer', 'Former YouTuber',
    'Gaming Content Creator', 'Gaming YouTuber', 'Gaming YouTubers',
    'Gaming/Esports Influencers', 'Gaming/YouTube Influencer', 'Health/Food YouTuber',
    'Instagram Influencer/Photographer', 'Instagram Meme Influencer',
    'Interior Designer/TV Personality', 'Kids/YouTube Influencer', 'Kids/YouTube Influencers',
    'Lifestyle Influencer', 'Lifestyle YouTuber', 'Lifestyle/Beauty Influencer',
    'Lifestyle/Beauty Influencers', 'Lifestyle/Beauty YouTuber', 'Lifestyle/YouTube Influencer',
    'Makeup Artist/Influencer', 'Men''s Lifestyle YouTuber', 'Model/Beauty Influencer',
    'Model/Influencer', 'Musicians/Influencers', 'Musicians/K-Pop Influencers',
    'News/YouTuber', 'Pet/Instagram Influencer', 'Podcast Host', 'Rapper/Entertainer',
    'Rapper/Entrepreneur', 'Rapper/Entrepreneur Influencer', 'Rapper/Influencer',
    'Reality TV Star/Influencer', 'Reality TV/Entrepreneur', 'Reality TV/Influencer',
    'Reality/Model Influencer', 'Science YouTuber', 'Singer/Artist', 'Singer/Artist Influencer',
    'Singer/Dancer', 'Singer/Entertainer', 'Singer/Entertainer Influencer',
    'Singer/Global Influencer', 'Singer/Influencer', 'Singer/Pop Culture Influencer',
    'Singer/Pop Influencer', 'Singer/Reality Star', 'Singer/Songwriter', 'Singer/TV Personality',
    'Skincare YouTuber', 'Spanish Gaming Influencer', 'Sports/YouTube Influencer',
    'Stylist/Fashion Influencer', 'Tech YouTuber', 'TikToker', 'TikToker/Influencer',
    'TikTokers', 'Travel/Lifestyle YouTuber', 'Travel/Minimalism YouTuber',
    'TV Host/Comedian', 'TV Host/Comedian Influencer', 'TV Host/Culinary Influencer',
    'TV Host/Influencer', 'TV Personality/Author', 'TV Personality/Influencer',
    'Twitch Streamers/Influencers', 'Vegan/YouTube Influencer', 'Wellness Influencer',
    'YouTuber', 'YouTuber/Baker', 'YouTuber/Comedian', 'YouTuber/Designer',
    'YouTuber/Filmmaker', 'YouTuber/Gaming', 'YouTuber/Influencer', 'YouTuber/Musician',
    'YouTuber/Philanthropist', 'YouTuber/Podcaster', 'YouTubers/Adventurers',
    'YouTubers/Boxers', 'YouTubers/Comedians', 'YouTubers/Gaming Influencers',
    'YouTubers/Pranksters'
  ])),
  CONSTRAINT valid_product_categories CHECK (product_category IS NULL OR product_category = ANY (ARRAY[
    'Alcoholic Beverages', 'Beauty & Personal Care', 'Beauty & Personal Care (Fragrance)',
    'Cannabis & CBD', 'Entertainment & Media', 'Fashion & Apparel', 'Food & Soft Drinks',
    'Health & Fitness', 'Home & Lifestyle', 'Sporting Goods & Outdoor Gear',
    'Sports & Esports', 'Tech & Electronics', 'Tech & Software',
    'Toys, Games & Children''s Products'
  ]))
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id text UNIQUE NOT NULL,
  email text,
  first_name text,
  last_name text,
  company text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  is_admin boolean DEFAULT false NOT NULL
);

-- Create favorite_brands table
CREATE TABLE IF NOT EXISTS favorite_brands (
  user_id uuid NOT NULL,
  brand_id bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid NOT NULL,
  brand_id bigint,
  goal_type goal_type DEFAULT 'other' NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  CONSTRAINT goals_status_check CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'cancelled']))
);

-- Create brand_comments table
CREATE TABLE IF NOT EXISTS brand_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id bigint NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create brand_reports table
CREATE TABLE IF NOT EXISTS brand_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_id bigint NOT NULL,
  issue_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create brand_suggestions table
CREATE TABLE IF NOT EXISTS brand_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_name text NOT NULL,
  creators text,
  product_category text,
  description text,
  year_founded integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  image_url text,
  published_at timestamptz NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create short_urls table
CREATE TABLE IF NOT EXISTS short_urls (
  id text PRIMARY KEY,
  url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  clicks integer DEFAULT 0,
  user_id uuid
);

-- Create system_config table
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cron_job_logs table
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL,
  message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create auth_audit_log table
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  event_type text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create embedding_processing_logs table
CREATE TABLE IF NOT EXISTS embedding_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  brands_processed integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  error_details text[]
);

-- Create news_feedback table
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
  -- favorite_brands foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'favorite_brands_brand_id_fkey'
  ) THEN
    ALTER TABLE favorite_brands 
    ADD CONSTRAINT favorite_brands_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id);
  END IF;

  -- goals foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goals_brand_id_fkey'
  ) THEN
    ALTER TABLE goals 
    ADD CONSTRAINT goals_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goals_user_id_fkey'
  ) THEN
    ALTER TABLE goals 
    ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- brand_comments foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brand_comments_brand_id_fkey'
  ) THEN
    ALTER TABLE brand_comments 
    ADD CONSTRAINT brand_comments_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brand_comments_user_id_fkey'
  ) THEN
    ALTER TABLE brand_comments 
    ADD CONSTRAINT brand_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- brand_reports foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brand_reports_brand_id_fkey'
  ) THEN
    ALTER TABLE brand_reports 
    ADD CONSTRAINT brand_reports_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brand_reports_user_id_fkey'
  ) THEN
    ALTER TABLE brand_reports 
    ADD CONSTRAINT brand_reports_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- brand_suggestions foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'brand_suggestions_user_id_fkey'
  ) THEN
    ALTER TABLE brand_suggestions 
    ADD CONSTRAINT brand_suggestions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  -- news_articles foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'news_articles_brand_id_fkey'
  ) THEN
    ALTER TABLE news_articles 
    ADD CONSTRAINT news_articles_brand_id_fkey 
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;
  END IF;

  -- news_feedback foreign keys
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

  -- short_urls foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'short_urls_user_id_fkey'
  ) THEN
    ALTER TABLE short_urls 
    ADD CONSTRAINT short_urls_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_brands_approval_status ON brands(approval_status);
CREATE INDEX IF NOT EXISTS idx_brands_approved_search ON brands(approval_status, lower(name), lower(creators)) WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_brands_category_status ON brands(product_category, approval_status);
CREATE INDEX IF NOT EXISTS idx_brands_creators_lower ON brands(lower(creators));
CREATE INDEX IF NOT EXISTS idx_brands_embedding ON brands USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS brands_embedding_idx ON brands USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_brands_founder_status ON brands(type_of_influencer, approval_status);
CREATE INDEX IF NOT EXISTS idx_brands_homepage_url ON brands(homepage_url);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_name_lower ON brands(lower(name));
CREATE INDEX IF NOT EXISTS idx_brands_wikipedia_url ON brands(wikipedia_url);
CREATE INDEX IF NOT EXISTS idx_brands_year_founded ON brands(year_founded DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON user_profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_admin_check ON user_profiles(auth_id, is_admin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_favorite_brands_brand_id ON favorite_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_favorite_brands_user_id ON favorite_brands(user_id);

CREATE INDEX IF NOT EXISTS idx_goals_brand_id ON goals(brand_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

CREATE INDEX IF NOT EXISTS brand_comments_brand_id_idx ON brand_comments(brand_id);
CREATE INDEX IF NOT EXISTS brand_comments_user_id_idx ON brand_comments(user_id);

CREATE INDEX IF NOT EXISTS brand_reports_brand_id_idx ON brand_reports(brand_id);
CREATE INDEX IF NOT EXISTS brand_reports_user_id_idx ON brand_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_brand_suggestions_user_id ON brand_suggestions(user_id);

CREATE INDEX IF NOT EXISTS idx_news_articles_brand_id ON news_articles(brand_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_feedback_user_id ON news_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_news_feedback_brand_id ON news_feedback(brand_id);
CREATE INDEX IF NOT EXISTS idx_news_feedback_url ON news_feedback(news_article_url);

CREATE INDEX IF NOT EXISTS idx_short_urls_created_at ON short_urls(created_at);
CREATE INDEX IF NOT EXISTS idx_short_urls_user_id ON short_urls(user_id);

-- Enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_processing_logs ENABLE ROW LEVEL SECURITY;

-- Create or replace functions
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_brand_story_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.brand_story IS DISTINCT FROM NEW.brand_story THEN
    NEW.last_story_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION next_brand_id()
RETURNS bigint AS $$
DECLARE
  next_id bigint;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM brands;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ 
BEGIN
  -- Drop existing triggers to avoid conflicts
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