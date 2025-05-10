/*
  # Add admin field to user profiles

  1. Changes
    - Adds is_admin column to user_profiles table
    - Sets default value to false
    - Updates existing users to non-admin status

  2. Security
    - Maintains existing RLS policies
*/

-- Add is_admin column to user_profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;