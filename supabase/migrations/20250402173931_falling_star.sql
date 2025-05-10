/*
  # Update goals table policies

  1. Changes
    - Safely adds policies if they don't exist
    - Maintains existing table structure
    - Preserves indexes

  2. Security
    - Maintains RLS policies for authenticated users
    - Ensures proper access control
*/

DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own goals" ON public.goals;
  DROP POLICY IF EXISTS "Users can create goals" ON public.goals;
  DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
  DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
END $$;

-- Create policies
CREATE POLICY "Users can read own goals"
  ON public.goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create goals"
  ON public.goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);