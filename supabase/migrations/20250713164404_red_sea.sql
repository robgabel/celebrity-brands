/*
  # Add missing columns to brand_suggestions table

  1. Changes
    - Add `comments` column (TEXT, nullable) for optional user feedback
    - Add `email` column (TEXT, nullable) for optional contact information
    - Add `status` column (TEXT, default 'pending') for tracking suggestion lifecycle
    - Add `created_at` column (TIMESTAMPTZ, default now()) for timestamp tracking

  2. Security
    - Maintains existing RLS policies
    - All new columns are nullable except status and created_at which have defaults
*/

-- Add comments column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_suggestions' AND column_name = 'comments'
  ) THEN
    ALTER TABLE brand_suggestions ADD COLUMN comments TEXT;
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_suggestions' AND column_name = 'email'
  ) THEN
    ALTER TABLE brand_suggestions ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_suggestions' AND column_name = 'status'
  ) THEN
    ALTER TABLE brand_suggestions ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_suggestions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE brand_suggestions ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;