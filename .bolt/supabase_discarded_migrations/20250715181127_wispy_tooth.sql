```sql
-- IDEMPOTENT MIGRATION
-- This migration updates the 'valid_founder_types' check constraint on the 'brands' table
-- to reflect the simplified list of influencer types used by the AI analysis function.

-- Drop the existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_founder_types' AND contype = 'c' AND conrelid = 'public.brands'::regclass) THEN
    ALTER TABLE public.brands DROP CONSTRAINT valid_founder_types;
  END IF;
END $$;

-- Add the new constraint with the simplified list of founder types
ALTER TABLE public.brands ADD CONSTRAINT valid_founder_types CHECK (type_of_influencer = ANY (ARRAY[
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