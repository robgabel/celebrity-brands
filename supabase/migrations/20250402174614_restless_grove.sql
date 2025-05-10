/*
  # Add social features for brands

  1. New Tables
    - favorite_brands: Track user's favorite brands
    - brand_comments: Store user comments on brands
    - brand_reports: Track reported content
    - brand_suggestions: Track user-submitted brand suggestions

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Ensure users can only modify their own data
*/

-- Create favorite_brands table
CREATE TABLE IF NOT EXISTS public.favorite_brands (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, brand_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_brands_user_id ON public.favorite_brands(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_brands_brand_id ON public.favorite_brands(brand_id);

ALTER TABLE public.favorite_brands ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'favorite_brands' 
    AND policyname = 'Users can manage their favorites'
  ) THEN
    CREATE POLICY "Users can manage their favorites"
      ON public.favorite_brands
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = favorite_brands.user_id 
          AND user_profiles.auth_id = auth.uid()::text
        )
      );
  END IF;
END $$;

-- Create brand_comments table
CREATE TABLE IF NOT EXISTS public.brand_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_comments_brand_id_idx ON public.brand_comments(brand_id);
CREATE INDEX IF NOT EXISTS brand_comments_user_id_idx ON public.brand_comments(user_id);

ALTER TABLE public.brand_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_comments' 
    AND policyname = 'Comments are viewable by everyone'
  ) THEN
    CREATE POLICY "Comments are viewable by everyone"
      ON public.brand_comments
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_comments' 
    AND policyname = 'Users can create comments'
  ) THEN
    CREATE POLICY "Users can create comments"
      ON public.brand_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create brand_reports table for flagging inappropriate content
CREATE TABLE IF NOT EXISTS public.brand_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_reports' 
    AND policyname = 'Users can create reports'
  ) THEN
    CREATE POLICY "Users can create reports"
      ON public.brand_reports
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_reports' 
    AND policyname = 'Users can view their own reports'
  ) THEN
    CREATE POLICY "Users can view their own reports"
      ON public.brand_reports
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create brand_suggestions table
CREATE TABLE IF NOT EXISTS public.brand_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name text NOT NULL,
  creators text NOT NULL,
  product_category text NOT NULL,
  description text NOT NULL,
  year_founded integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.brand_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_suggestions' 
    AND policyname = 'Users can create brand suggestions'
  ) THEN
    CREATE POLICY "Users can create brand suggestions"
      ON public.brand_suggestions
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'brand_suggestions' 
    AND policyname = 'Users can view their own suggestions'
  ) THEN
    CREATE POLICY "Users can view their own suggestions"
      ON public.brand_suggestions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;