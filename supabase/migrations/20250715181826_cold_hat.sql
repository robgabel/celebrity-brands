```sql
-- IDEMPOTENT MIGRATION
-- This migration has been made idempotent and can be run multiple times safely.

-- Drop the existing valid_founder_types constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_founder_types') THEN
    ALTER TABLE brands DROP CONSTRAINT valid_founder_types;
  END IF;
END $$;

-- Update existing type_of_influencer values that do not match the new simplified list to NULL
-- This ensures no existing row will violate the new constraint when it's added.
UPDATE brands
SET type_of_influencer = NULL
WHERE type_of_influencer NOT IN (
    'Actor',
    'Athlete',
    'Author',
    'Chef',
    'Dancer',
    'Digital Creator',
    'Gamer',
    'Musician',
    'Public Figure',
    'TV/Media Personality'
);

-- Add the new valid_founder_types constraint with the simplified list
ALTER TABLE brands ADD CONSTRAINT valid_founder_types CHECK (type_of_influencer = ANY (ARRAY[
    'Actor'::text,
    'Athlete'::text,
    'Author'::text,
    'Chef'::text,
    'Dancer'::text,
    'Digital Creator'::text,
    'Gamer'::text,
    'Musician'::text,
    'Public Figure'::text,
    'TV/Media Personality'::text
]));
```