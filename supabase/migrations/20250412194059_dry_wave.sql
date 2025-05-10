/*
  # Add Yeezy brand

  1. Changes
    - Adds Yeezy brand to the brands table
    - Uses dynamic ID generation to avoid conflicts
    - Sets all required fields with verified information

  2. Security
    - Maintains existing RLS policies
    - No security changes needed
*/

DO $$ 
DECLARE
  next_id bigint;
BEGIN
  -- Get the next available ID
  SELECT COALESCE(MAX(id) + 1, 1) INTO next_id FROM public.brands;

  -- Insert the new brand
  INSERT INTO public.brands (
    id,
    name,
    creators,
    product_category,
    description,
    year_founded,
    year_discontinued,
    brand_collab,
    type_of_influencer,
    logo_url,
    social_links,
    created_at,
    updated_at,
    homepage_url
  ) VALUES (
    next_id,
    'Yeezy',
    'Kanye West',
    'Fashion & Apparel',
    'A fashion brand of clothing and footwear founded by rapper Kanye West. Known for minimalist designs, limited-edition releases and high-end streetwear.',
    2009,
    2022,
    false,
    'Singer/Artist',
    NULL,
    NULL,
    NOW(),
    NOW(),
    NULL
  );
END $$;