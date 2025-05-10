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
    WHEN 'Blogilates' THEN 'https://www.blogilates.com'
    WHEN 'Bored Breakfast Club' THEN 'https://boredbreakfastclub.com'
    WHEN 'Caliwater' THEN 'https://drinkcaliwater.com'
    WHEN 'Chamberlain Coffee' THEN 'https://chamberlaincoffee.com'
    WHEN 'Dae Hair' THEN 'https://daehair.com'
    WHEN 'Dezi' THEN 'https://dezilife.com'
    WHEN 'Djerf Avenue' THEN 'https://djerfavenue.com'
    WHEN 'Doe Lashes' THEN 'https://doelashes.com'
    WHEN 'Em Cosmetics' THEN 'https://www.emcosmetics.com'
    WHEN 'Feastables' THEN 'https://feastables.com'
    WHEN 'Half Magic Beauty' THEN 'https://halfmagicbeauty.com'
    WHEN 'Happy Dad' THEN 'https://happydad.com'
    WHEN 'Hims' THEN 'https://www.hims.com'
    WHEN 'Hers' THEN 'https://www.forhers.com'
    WHEN 'Item Beauty' THEN 'https://itembeauty.com'
    WHEN 'JuneShine' THEN 'https://juneshine.com'
    WHEN 'KraveBeauty' THEN 'https://kravebeauty.com'
    WHEN 'LoveSeen' THEN 'https://loveseen.com'
    WHEN 'Markian' THEN 'https://markian.com'
    WHEN 'Merit' THEN 'https://meritbeauty.com'
    WHEN 'Moon' THEN 'https://moonoralcare.com'
    WHEN 'Nudestix' THEN 'https://nudestix.com'
    WHEN 'Offhours' THEN 'https://offhours.co'
    WHEN 'One/Size Beauty' THEN 'https://onesizebeauty.com'
    WHEN 'Open Formula' THEN 'https://openformula.com'
    WHEN 'Patrick Ta Beauty' THEN 'https://patrickta.com'
    WHEN 'Peace Out Skincare' THEN 'https://peaceoutskincare.com'
    WHEN 'Poppi' THEN 'https://drinkpoppi.com'
    WHEN 'Prime Hydration' THEN 'https://drinkprime.com'
    WHEN 'Rose Inc' THEN 'https://roseinc.com'
    WHEN 'Selfless by Hyram' THEN 'https://selflessbyhyram.com'
    WHEN 'Summer Fridays' THEN 'https://summerfridays.com'
    WHEN 'Sweet Chef' THEN 'https://sweetchefskincare.com'
    WHEN 'Tower 28' THEN 'https://tower28beauty.com'
    WHEN 'Twentyninethin' THEN 'https://twentyninethin.com'
    WHEN 'Vacation' THEN 'https://www.vacation.inc'
    WHEN 'Wildflower Cases' THEN 'https://wildflowercases.com'
    END
WHERE homepage_url IS NULL 
AND brand_collab = false
AND name IN (
    'Blogilates',
    'Bored Breakfast Club',
    'Caliwater',
    'Chamberlain Coffee',
    'Dae Hair',
    'Dezi',
    'Djerf Avenue',
    'Doe Lashes',
    'Em Cosmetics',
    'Feastables',
    'Half Magic Beauty',
    'Happy Dad',
    'Hims',
    'Hers',
    'Item Beauty',
    'JuneShine',
    'KraveBeauty',
    'LoveSeen',
    'Markian',
    'Merit',
    'Moon',
    'Nudestix',
    'Offhours',
    'One/Size Beauty',
    'Open Formula',
    'Patrick Ta Beauty',
    'Peace Out Skincare',
    'Poppi',
    'Prime Hydration',
    'Rose Inc',
    'Selfless by Hyram',
    'Summer Fridays',
    'Sweet Chef',
    'Tower 28',
    'Twentyninethin',
    'Vacation',
    'Wildflower Cases'
);