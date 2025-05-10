/*
  # Update brand categories

  1. Changes
    - Updates existing records to use the new categories
    - Adds a check constraint to ensure only valid categories are used
    - Makes the changes in a safe order to avoid constraint violations

  2. Security
    - Maintains existing RLS policies
*/

-- First update the categories
DO $$ 
BEGIN
  -- Update fashion-related brands
  UPDATE brands 
  SET product_category = 'Fashion & Apparel'
  WHERE product_category ILIKE '%fashion%' 
     OR product_category ILIKE '%apparel%'
     OR product_category ILIKE '%clothing%';

  -- Update beverage brands
  UPDATE brands 
  SET product_category = 'Alcoholic Beverages'
  WHERE product_category ILIKE '%alcohol%' 
     OR product_category ILIKE '%wine%'
     OR product_category ILIKE '%spirits%';

  UPDATE brands 
  SET product_category = 'Food & Soft Drinks'
  WHERE product_category ILIKE '%food%' 
     OR product_category ILIKE '%beverage%'
     OR product_category ILIKE '%drink%'
     AND NOT product_category ILIKE '%alcohol%';

  -- Update beauty brands
  UPDATE brands 
  SET product_category = 'Beauty & Personal Care'
  WHERE product_category ILIKE '%beauty%' 
     OR product_category ILIKE '%cosmetic%'
     OR product_category ILIKE '%skincare%'
     AND NOT product_category ILIKE '%fragrance%'
     AND NOT product_category ILIKE '%perfume%';

  UPDATE brands 
  SET product_category = 'Beauty & Personal Care (Fragrance)'
  WHERE product_category ILIKE '%fragrance%' 
     OR product_category ILIKE '%perfume%';

  -- Update entertainment brands
  UPDATE brands 
  SET product_category = 'Entertainment & Media'
  WHERE product_category ILIKE '%entertainment%' 
     OR product_category ILIKE '%media%'
     OR product_category ILIKE '%music%'
     OR product_category ILIKE '%film%';

  -- Update tech brands
  UPDATE brands 
  SET product_category = 'Tech & Electronics'
  WHERE product_category ILIKE '%electronics%' 
     OR product_category ILIKE '%gadget%';

  UPDATE brands 
  SET product_category = 'Tech & Software'
  WHERE product_category ILIKE '%software%' 
     OR product_category ILIKE '%app%'
     OR product_category ILIKE '%digital%';

  -- Update sports and fitness brands
  UPDATE brands 
  SET product_category = 'Sports & Esports'
  WHERE product_category ILIKE '%esport%' 
     OR product_category ILIKE '%gaming%';

  UPDATE brands 
  SET product_category = 'Sporting Goods & Outdoor Gear'
  WHERE product_category ILIKE '%sport%' 
     OR product_category ILIKE '%outdoor%'
     OR product_category ILIKE '%equipment%'
     AND NOT product_category ILIKE '%esport%'
     AND NOT product_category ILIKE '%gaming%';

  UPDATE brands 
  SET product_category = 'Health & Fitness'
  WHERE product_category ILIKE '%health%' 
     OR product_category ILIKE '%fitness%'
     OR product_category ILIKE '%wellness%';

  -- Update home and lifestyle brands
  UPDATE brands 
  SET product_category = 'Home & Lifestyle'
  WHERE product_category ILIKE '%home%' 
     OR product_category ILIKE '%lifestyle%'
     OR product_category ILIKE '%decor%';

  -- Update cannabis brands
  UPDATE brands 
  SET product_category = 'Cannabis & CBD'
  WHERE product_category ILIKE '%cannabis%' 
     OR product_category ILIKE '%cbd%'
     OR product_category ILIKE '%hemp%';

  -- Update toys and games brands
  UPDATE brands 
  SET product_category = 'Toys, Games & Children''s Products'
  WHERE product_category ILIKE '%toy%' 
     OR product_category ILIKE '%game%'
     OR product_category ILIKE '%children%'
     OR product_category ILIKE '%kid%'
     AND NOT product_category ILIKE '%esport%'
     AND NOT product_category ILIKE '%gaming%';

  -- Catch any remaining uncategorized brands
  UPDATE brands 
  SET product_category = 'Fashion & Apparel'
  WHERE product_category NOT IN (
    'Alcoholic Beverages',
    'Beauty & Personal Care',
    'Beauty & Personal Care (Fragrance)',
    'Cannabis & CBD',
    'Entertainment & Media',
    'Fashion & Apparel',
    'Food & Soft Drinks',
    'Health & Fitness',
    'Home & Lifestyle',
    'Sporting Goods & Outdoor Gear',
    'Sports & Esports',
    'Tech & Electronics',
    'Tech & Software',
    'Toys, Games & Children''s Products'
  );
END $$;

-- Now that all data is updated, we can safely add the constraint
DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_product_categories' 
    AND table_name = 'brands'
  ) THEN
    ALTER TABLE brands DROP CONSTRAINT valid_product_categories;
  END IF;
END $$;

-- Add the new constraint
ALTER TABLE brands ADD CONSTRAINT valid_product_categories CHECK (
  product_category = ANY (ARRAY[
    'Alcoholic Beverages',
    'Beauty & Personal Care',
    'Beauty & Personal Care (Fragrance)',
    'Cannabis & CBD',
    'Entertainment & Media',
    'Fashion & Apparel',
    'Food & Soft Drinks',
    'Health & Fitness',
    'Home & Lifestyle',
    'Sporting Goods & Outdoor Gear',
    'Sports & Esports',
    'Tech & Electronics',
    'Tech & Software',
    'Toys, Games & Children''s Products'
  ])
);