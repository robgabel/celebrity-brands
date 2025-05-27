/*
  # Add Wikipedia URL to brands table
  
  1. Changes
    - Add `wikipedia_url` column to brands table to store Wikipedia page URLs
    
  2. Notes
    - Column is nullable since not all brands may have Wikipedia pages
    - URLs will be populated by the analyze-brands edge function
*/

ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;