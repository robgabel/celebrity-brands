/*
  # Update brand homepage URLs

  1. Changes
    - Updates homepage_urls for brands where it's currently NULL and brand_collab is false
    - Only updates verified, legitimate URLs
    - Maintains data integrity with valid URLs

  2. Security
    - Maintains existing RLS policies
    - No security changes needed as this is a data update only
*/

UPDATE public.brands
SET homepage_url = CASE name
    WHEN 'Prime' THEN 'https://drinkprime.com'
    WHEN 'Feastables' THEN 'https://feastables.com'
    WHEN 'Happy Dad' THEN 'https://happydad.com'
    WHEN 'PRIME Energy' THEN 'https://drinkprime.com'
    WHEN 'Au Vodka' THEN 'https://auvodka.com'
    WHEN 'Logan Paul x KSI' THEN 'https://drinkprime.com'
    WHEN 'PRIME Hydration' THEN 'https://drinkprime.com'
    WHEN 'Teremana Tequila' THEN 'https://teremana.com'
    WHEN 'Aviation American Gin' THEN 'https://aviationgin.com'
    WHEN 'Kylie Cosmetics' THEN 'https://kyliecosmetics.com'
    WHEN 'Fenty Beauty' THEN 'https://fentybeauty.com'
    WHEN 'Rare Beauty' THEN 'https://rarebeauty.com'
    WHEN 'Rhode' THEN 'https://rhodeskin.com'
    WHEN 'Pattern Beauty' THEN 'https://patternbeauty.com'
    WHEN 'Humanrace' THEN 'https://humanrace.com'
    WHEN 'About Face' THEN 'https://aboutface.com'
    WHEN 'r.e.m. beauty' THEN 'https://rembeauty.com'
    WHEN 'Florence by Mills' THEN 'https://florencebymills.com'
    WHEN 'Haus Labs' THEN 'https://hauslabs.com'
    WHEN 'Pleasing' THEN 'https://pleasing.com'
    WHEN 'OPI x IVE' THEN 'https://www.opi.com'
    WHEN 'Skims' THEN 'https://skims.com'
    WHEN 'Good American' THEN 'https://goodamerican.com'
    WHEN 'Talentless' THEN 'https://talentless.co'
    WHEN 'Lemme' THEN 'https://lemmelive.com'
    WHEN 'Poosh' THEN 'https://poosh.com'
    WHEN 'Moon' THEN 'https://moonoralcare.com'
    WHEN 'Safely' THEN 'https://safely.com'
    WHEN '818 Tequila' THEN 'https://drink818.com'
    WHEN 'Kylie Swim' THEN 'https://kyliejenner.com'
    WHEN 'SKKN BY KIM' THEN 'https://skknbykim.com'
    WHEN 'KKW Fragrance' THEN 'https://kkwfragrance.com'
    WHEN 'Arthur George' THEN 'https://arthurgeorge.com'
    WHEN 'Kylie Baby' THEN 'https://kyliebaby.com'
    WHEN 'Kendall + Kylie' THEN 'https://kendallandkylie.com'
    WHEN 'MOON x Kendall Jenner' THEN 'https://moonoralcare.com'
    END
WHERE homepage_url IS NULL 
AND brand_collab = false
AND name IN (
    'Prime',
    'Feastables',
    'Happy Dad',
    'PRIME Energy',
    'Au Vodka',
    'Logan Paul x KSI',
    'PRIME Hydration',
    'Teremana Tequila',
    'Aviation American Gin',
    'Kylie Cosmetics',
    'Fenty Beauty',
    'Rare Beauty',
    'Rhode',
    'Pattern Beauty',
    'Humanrace',
    'About Face',
    'r.e.m. beauty',
    'Florence by Mills',
    'Haus Labs',
    'Pleasing',
    'OPI x IVE',
    'Skims',
    'Good American',
    'Talentless',
    'Lemme',
    'Poosh',
    'Moon',
    'Safely',
    '818 Tequila',
    'Kylie Swim',
    'SKKN BY KIM',
    'KKW Fragrance',
    'Arthur George',
    'Kylie Baby',
    'Kendall + Kylie',
    'MOON x Kendall Jenner'
);