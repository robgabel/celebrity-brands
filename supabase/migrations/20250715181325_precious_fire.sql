/*
  # Update founder types constraint

  1. Changes
    - Drop the existing valid_founder_types constraint with 100+ specific values
    - Add new simplified constraint with 10 broad categories
    - This allows the analyze-brands function to work with simplified types

  2. New founder types
    - Actor, Athlete, Author, Chef, Dancer, Digital Creator, Gamer, Musician, Public Figure, TV/Media Personality
*/

-- Drop the existing constraint
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Add the new simplified constraint
ALTER TABLE brands ADD CONSTRAINT valid_founder_types 
CHECK (type_of_influencer IS NULL OR type_of_influencer = ANY (ARRAY[
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
]));