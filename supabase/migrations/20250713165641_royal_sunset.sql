/*
  # Set created_at to NOT NULL in brand_suggestions table

  1. Updates
    - Update any existing NULL created_at values to current timestamp
    - Set created_at column to NOT NULL constraint
    - Set default value for created_at to now()

  2. Safety
    - Handles existing NULL values before applying constraint
    - Uses idempotent operations to prevent errors on re-run
*/

-- First, update any existing NULL created_at values to current timestamp
UPDATE brand_suggestions 
SET created_at = now() 
WHERE created_at IS NULL;

-- Set default value for created_at column
DO $$ 
BEGIN
  -- Check if default constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_suggestions' 
    AND column_name = 'created_at' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE brand_suggestions 
    ALTER COLUMN created_at SET DEFAULT now();
  END IF;
END $$;

-- Set created_at to NOT NULL
DO $$ 
BEGIN
  -- Check if column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'brand_suggestions' 
    AND column_name = 'created_at' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE brand_suggestions 
    ALTER COLUMN created_at SET NOT NULL;
  END IF;
END $$;