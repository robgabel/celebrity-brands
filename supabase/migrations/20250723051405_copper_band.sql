/*
  # Fix founder types constraint

  1. Drop existing constraint
  2. Clean existing data to match new simplified types
  3. Add new constraint with simplified types

  This migration ensures all existing data is compatible before applying the new constraint.
*/

-- Step 1: Drop the existing constraint
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Step 2: Update existing data to match simplified types
UPDATE brands SET type_of_influencer = CASE
  WHEN type_of_influencer LIKE '%Actor%' OR type_of_influencer LIKE '%Actress%' THEN 'Actor'
  WHEN type_of_influencer LIKE '%Athlete%' OR type_of_influencer LIKE '%Sports%' THEN 'Athlete'
  WHEN type_of_influencer LIKE '%Author%' OR type_of_influencer LIKE '%Writer%' THEN 'Author'
  WHEN type_of_influencer LIKE '%Chef%' THEN 'Chef'
  WHEN type_of_influencer LIKE '%Dancer%' THEN 'Dancer'
  WHEN type_of_influencer LIKE '%YouTuber%' OR type_of_influencer LIKE '%YouTube%' OR type_of_influencer LIKE '%Content Creator%' OR type_of_influencer LIKE '%TikTok%' OR type_of_influencer LIKE '%Influencer%' THEN 'Digital Creator'
  WHEN type_of_influencer LIKE '%Gaming%' OR type_of_influencer LIKE '%Gamer%' OR type_of_influencer LIKE '%Esports%' THEN 'Gamer'
  WHEN type_of_influencer LIKE '%Singer%' OR type_of_influencer LIKE '%Musician%' OR type_of_influencer LIKE '%Rapper%' THEN 'Musician'
  WHEN type_of_influencer LIKE '%TV%' OR type_of_influencer LIKE '%Host%' OR type_of_influencer LIKE '%Reality%' THEN 'TV/Media Personality'
  ELSE 'Public Figure'
END
WHERE type_of_influencer IS NOT NULL;

-- Step 3: Add the new simplified constraint
ALTER TABLE brands ADD CONSTRAINT valid_founder_types CHECK (
  type_of_influencer IS NULL OR type_of_influencer IN (
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
  )
);