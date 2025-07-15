/*
# Update founder types constraint

This migration updates the valid_founder_types constraint to use simplified categories
that match the analyze-brands function output.

## Changes
1. Drop the existing valid_founder_types constraint
2. Add new constraint with simplified founder types
*/

-- Drop the existing constraint
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Add new constraint with simplified founder types
ALTER TABLE brands ADD CONSTRAINT valid_founder_types 
CHECK (type_of_influencer = ANY (ARRAY[
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