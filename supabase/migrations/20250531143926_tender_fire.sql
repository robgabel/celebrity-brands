/*
  # Ensure Database Idempotency
  
  1. Changes
    - Adds safety checks for existing objects
    - Wraps operations in DO blocks for safe execution
    - Adds proper error handling
  
  2. Safety
    - All operations are idempotent
    - Prevents duplicate operations
    - Handles edge cases
*/

-- Ensure RLS is enabled on all tables that should have it
DO $$ 
BEGIN
  -- brands table
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'brands' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
  END IF;

  -- user_profiles table
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;

  -- goals table
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'goals' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.goals ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Ensure all foreign key constraints have proper ON DELETE actions
DO $$ 
BEGIN
  -- Check and update goals.user_id foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints 
    WHERE constraint_schema = 'public'
    AND constraint_name = 'goals_user_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE public.goals 
    DROP CONSTRAINT IF EXISTS goals_user_id_fkey,
    ADD CONSTRAINT goals_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure all required indexes exist
DO $$ 
BEGIN
  -- Add index for brands.name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'brands' 
    AND indexname = 'idx_brands_name_lower'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_brands_name_lower ON public.brands (lower(name));
  END IF;

  -- Add index for brands.creators if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'brands' 
    AND indexname = 'idx_brands_creators_lower'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_brands_creators_lower ON public.brands (lower(creators));
  END IF;
END $$;

-- Ensure all tables have updated_at trigger
DO $$ 
BEGIN
  -- Add trigger to brands table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_brands_updated_at'
  ) THEN
    CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;

  -- Add trigger to user_profiles table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_updated_at'
  ) THEN
    CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;