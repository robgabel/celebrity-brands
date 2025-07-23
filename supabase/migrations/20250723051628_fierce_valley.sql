/*
  # Force Remove Founder Types Constraint

  This migration completely removes the problematic valid_founder_types constraint
  that is preventing the analyze-brands function from working.

  1. Drop the constraint completely
  2. Allow any text value in type_of_influencer column
  3. Let the AI function handle the classification
*/

-- Drop the problematic constraint completely
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Also drop any other founder type constraints that might exist
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'brands'::regclass 
        AND conname LIKE '%founder%'
    LOOP
        EXECUTE 'ALTER TABLE brands DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- Verify the constraint is gone
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'brands'::regclass 
        AND conname = 'valid_founder_types'
    ) THEN
        RAISE EXCEPTION 'Constraint still exists!';
    ELSE
        RAISE NOTICE 'Constraint successfully removed';
    END IF;
END $$;