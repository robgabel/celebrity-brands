/*
  # Find and update brand homepage URLs

  1. Changes
    - First finds all brands with NULL homepage_url and brand_collab = false
    - Then updates homepage URLs for verified brand websites

  2. Security
    - Maintains existing RLS policies
    - No destructive operations
*/

-- First, let's find all brands that need homepage URLs
SELECT name, creators, product_category
FROM public.brands
WHERE homepage_url IS NULL 
AND brand_collab = false
ORDER BY name;

-- Then update the URLs for verified brand websites
UPDATE public.brands
SET homepage_url = CASE name
    WHEN 'Chamberlain Coffee' THEN 'https://chamberlaincoffee.com'
    WHEN 'Doughbrik''s Pizza' THEN 'https://doughbrikspizza.com'
    WHEN 'Fanjoy' THEN 'https://fanjoy.co'
    WHEN 'JuJu Supply' THEN 'https://jujusupply.com'
    WHEN 'Markian' THEN 'https://markian.com'
    WHEN 'Poppi' THEN 'https://drinkpoppi.com'
    WHEN 'Prime Pizza' THEN 'https://primepizza.la'
    WHEN 'Rhoback' THEN 'https://rhoback.com'
    WHEN 'Sunny D' THEN 'https://sunnyd.com'
    WHEN 'Teddy Fresh' THEN 'https://teddyfresh.com'
    WHEN 'Twentyninethin' THEN 'https://twentyninethin.com'
    WHEN 'Wildflower Cases' THEN 'https://wildflowercases.com'
    END
WHERE homepage_url IS NULL 
AND brand_collab = false
AND name IN (
    'Chamberlain Coffee',
    'Doughbrik''s Pizza',
    'Fanjoy',
    'JuJu Supply',
    'Markian',
    'Poppi',
    'Prime Pizza',
    'Rhoback',
    'Sunny D',
    'Teddy Fresh',
    'Twentyninethin',
    'Wildflower Cases'
);