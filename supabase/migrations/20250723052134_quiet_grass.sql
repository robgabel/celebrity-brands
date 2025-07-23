/*
  # Elon Musk Plan: Fix Founder Types Constraint

  This migration implements the "first principles" approach to fix the founder types constraint:
  
  1. Drop the existing constraint completely
  2. Clean all existing data to match the new simplified list
  3. Add the new constraint with the correct values
  
  This ensures zero conflicts and aligns the database with the analyze-brands function.
*/

-- Step 1: Drop the existing constraint completely
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Step 2: Clean existing data - map all current values to the new simplified list
UPDATE brands SET type_of_influencer = CASE
  -- Map existing values to new simplified values
  WHEN type_of_influencer ILIKE '%actor%' OR type_of_influencer ILIKE '%actress%' THEN 'Actor'
  WHEN type_of_influencer ILIKE '%athlete%' OR type_of_influencer ILIKE '%sports%' THEN 'Athlete'
  WHEN type_of_influencer ILIKE '%author%' OR type_of_influencer ILIKE '%writer%' THEN 'Author'
  WHEN type_of_influencer ILIKE '%chef%' OR type_of_influencer ILIKE '%cook%' THEN 'Chef'
  WHEN type_of_influencer ILIKE '%dancer%' OR type_of_influencer ILIKE '%dance%' THEN 'Dancer'
  WHEN type_of_influencer ILIKE '%digital%' OR type_of_influencer ILIKE '%content creator%' OR type_of_influencer ILIKE '%youtuber%' OR type_of_influencer ILIKE '%tiktoker%' OR type_of_influencer ILIKE '%influencer%' THEN 'Digital Creator'
  WHEN type_of_influencer ILIKE '%gamer%' OR type_of_influencer ILIKE '%gaming%' OR type_of_influencer ILIKE '%esports%' THEN 'Gamer'
  WHEN type_of_influencer ILIKE '%musician%' OR type_of_influencer ILIKE '%singer%' OR type_of_influencer ILIKE '%rapper%' OR type_of_influencer ILIKE '%artist%' OR type_of_influencer ILIKE '%band%' THEN 'Musician'
  WHEN type_of_influencer ILIKE '%tv%' OR type_of_influencer ILIKE '%television%' OR type_of_influencer ILIKE '%media%' OR type_of_influencer ILIKE '%host%' OR type_of_influencer ILIKE '%presenter%' THEN 'TV/Media Personality'
  WHEN type_of_influencer ILIKE '%public figure%' OR type_of_influencer ILIKE '%celebrity%' OR type_of_influencer ILIKE '%entrepreneur%' OR type_of_influencer ILIKE '%business%' THEN 'Public Figure'
  -- Set everything else to NULL so it can be re-analyzed
  ELSE NULL
END
WHERE type_of_influencer IS NOT NULL;

-- Step 3: Add the new constraint with the exact values the analyze-brands function expects
ALTER TABLE brands ADD CONSTRAINT valid_founder_types CHECK (
  type_of_influencer IS NULL OR type_of_influencer = ANY (ARRAY[
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
  ])
);

-- Step 4: Show summary of what was cleaned
DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM brands WHERE type_of_influencer IS NULL;
  SELECT COUNT(*) INTO total_count FROM brands;
  
  RAISE NOTICE 'Founder types constraint fix completed:';
  RAISE NOTICE '- Total brands: %', total_count;
  RAISE NOTICE '- Brands with NULL type_of_influencer (ready for re-analysis): %', null_count;
  RAISE NOTICE '- Brands with valid type_of_influencer: %', total_count - null_count;
END $$;