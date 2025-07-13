/*
  # Create brand suggestions table

  1. New Tables
    - `brand_suggestions`
      - `id` (uuid, primary key)
      - `brand_name` (text, required)
      - `creators` (text, required)
      - `is_collab` (boolean, default false)
      - `comments` (text, optional)
      - `email` (text, optional)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `brand_suggestions` table
    - Add policy for public insert access
    - Add policy for admin read access
*/

CREATE TABLE IF NOT EXISTS brand_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  creators text NOT NULL,
  is_collab boolean DEFAULT false,
  comments text,
  email text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brand_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit suggestions
CREATE POLICY "Anyone can submit brand suggestions"
  ON brand_suggestions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow admins to read all suggestions
CREATE POLICY "Admins can read all suggestions"
  ON brand_suggestions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.auth_id = (auth.uid())::text
      AND user_profiles.is_admin = true
    )
  );

-- Add status constraint
ALTER TABLE brand_suggestions 
ADD CONSTRAINT valid_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add index for admin queries
CREATE INDEX IF NOT EXISTS idx_brand_suggestions_status 
ON brand_suggestions (status, created_at DESC);

-- Add index for email (for potential follow-up)
CREATE INDEX IF NOT EXISTS idx_brand_suggestions_email 
ON brand_suggestions (email) 
WHERE email IS NOT NULL;