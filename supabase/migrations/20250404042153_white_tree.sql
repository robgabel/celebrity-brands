/*
  # Add new celebrity alcohol brands

  1. Changes
    - Adds 27 new celebrity alcohol brands to the brands table
    - Maintains data consistency with existing schema
    - Uses valid type_of_influencer values from constraint

  2. Security
    - Maintains existing RLS policies
    - No security changes needed
*/

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
) VALUES
  (325, 'Casa Del Sol Spirits', 'Eva Longoria', 'Alcoholic Beverages', 'A luxury sipping tequila inspired by the magic of golden hour and the legend of the Aztec goddess Mayahuel.', 2021, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.casadelsoltequila.com/'),
  (326, 'Fresh Vine Wine', 'Nina Dobrev & Julianne Hough', 'Alcoholic Beverages', 'An exclusive collection of premium low-carb, low-calorie, gluten-free wines crafted for active lifestyles.', 2021, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://freshvinewine.com/'),
  (327, 'Brother''s Bond Bourbon', 'Ian Somerhalder & Paul Wesley', 'Alcoholic Beverages', 'A hand-selected batch of bourbon whiskey reflecting the brotherhood and shared passion for great bourbon.', 2021, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://brothersbondbourbon.com/'),
  (328, 'Mulholland Distilling', 'Walton Goggins & Matthew Alper', 'Alcoholic Beverages', 'An authentic LA brand offering a range of spirits, including vodka, gin, and whiskey.', 2018, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://mulhollanddistilling.com/'),
  (329, 'SirDavis Whisky', 'Beyoncé Knowles-Carter', 'Alcoholic Beverages', 'An award-winning American whisky crafted in partnership with Moët Hennessy and Dr. Bill Lumsden.', 2024, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.sirdavis.com/'),
  (330, 'Sprinter', 'Kylie Jenner', 'Alcoholic Beverages', 'A bold and juicy ready-to-drink vodka soda made with real fruit juice, premium vodka, and sparkling water.', 2024, NULL, false, 'TV Personality/Influencer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.drinksprinter.com/'),
  (331, 'Papa Salt Coastal Gin', 'Margot Robbie & Friends', 'Alcoholic Beverages', 'A gin inspired by the Australian coastline, embodying the laid-back Australian lifestyle.', 2023, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.papasaltgin.com/'),
  (332, 'Gin & Juice', 'Dr. Dre & Snoop Dogg', 'Alcoholic Beverages', 'A ready-to-drink cocktail inspired by Snoop Dogg''s iconic song, made with high-quality premium gin.', 2024, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://bydreandsnoop.com/'),
  (333, 'Meili Vodka', 'Jason Momoa & Blaine Halvorson', 'Alcoholic Beverages', 'An award-winning vodka crafted with the finest ingredients and certified gluten-free.', 2023, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.meilivodka.com/'),
  (334, 'The Gardener Gin', 'Brad Pitt & Perrin Family', 'Alcoholic Beverages', 'A gin created in collaboration with distiller Tom Nichol, inspired by the French Riviera.', 2023, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://the-gardener.com/'),
  (335, 'Pantalones Organic Tequila', 'Matthew & Camila McConaughey', 'Alcoholic Beverages', 'An award-winning line of super premium organic tequila crafted to celebrate fun and not taking life too seriously.', 2023, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://pantalonestequila.com/'),
  (336, 'Cincoro Tequila', 'Michael Jordan & NBA Owners', 'Alcoholic Beverages', 'A super premium tequila brand founded by five NBA legends, including Michael Jordan.', 2019, NULL, false, 'Content Creator', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.cincoro.com/'),
  (337, 'Crossfire Hurricane Rum', 'The Rolling Stones', 'Alcoholic Beverages', 'A signature rum inspired by the opening lyric of their hit song ''Jumpin'' Jack Flash''.', 2023, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.crossfirehurricane.com/'),
  (338, 'Fraser & Thompson Whiskey', 'Michael Bublé & Paul Cirka', 'Alcoholic Beverages', 'An elegantly blended North American whiskey crafted by award-winning Master Distiller Paul Cirka.', 2023, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://fraserandthompson.com/'),
  (339, 'Vosa Spirits', 'Kate Upton', 'Alcoholic Beverages', 'A canned cocktail brand offering alcoholic still water and sparkling water options.', 2020, NULL, false, 'Model/Influencer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.vosaspirits.com/'),
  (340, 'Holistic Spirits Company', 'Woody Harrelson & Amy Holmwood', 'Alcoholic Beverages', 'A plant-based spirits company focusing on sustainability and transparency.', 2023, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://drinkholistic.com/'),
  (341, 'Volley Tequila Seltzer', 'Alex Morgan & Camila Soriano', 'Alcoholic Beverages', 'A clean, preservative-free tequila seltzer made with organic juice.', 2020, NULL, false, 'Content Creator', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://drinkvolley.com/'),
  (342, 'Sweet Grass Vodka', 'Jeremy Renner & Jarrod Swanger', 'Alcoholic Beverages', 'A 100% potato vodka sourced locally in South Carolina.', 2020, '2024', false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://sweetgrassvodka.com/'),
  (343, 'Betty Booze', 'Blake Lively', 'Alcoholic Beverages', 'A line of gourmet sparkling canned cocktails made with high-quality ingredients.', 2023, NULL, false, 'Actress/Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://bettybooze.com/'),
  (344, 'Delola', 'Jennifer Lopez', 'Alcoholic Beverages', 'A line of ready-to-drink spritzes and cocktails crafted with natural botanicals.', 2023, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://delolalife.com/'),
  (345, 'Gentleman''s Cut Bourbon', 'Stephen Curry', 'Alcoholic Beverages', 'A premium Kentucky Straight Bourbon Whiskey aged 5-7 years.', 2023, NULL, false, 'Content Creator', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.gentlemanscutbourbon.com/'),
  (346, 'Renais Gin', 'Emma & Alex Watson', 'Alcoholic Beverages', 'A luxury modern gin distilled from reclaimed French grapes and natural botanicals.', 2023, NULL, false, 'Actress/Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.renais.co.uk/'),
  (347, 'Sunny Vodka', 'Anastasia Karanikolaou & Zack Bia', 'Alcoholic Beverages', 'A small-batch, American-made, corn-based vodka capturing the essence of West Hollywood.', 2022, NULL, false, 'Content Creator', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://sunnyvodka.com/'),
  (348, 'Mercer + Prince', 'A$AP Rocky', 'Alcoholic Beverages', 'A blended Canadian whisky aged a minimum of 4 years in American white oak barrels.', 2022, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.mercerandprince.com/'),
  (349, 'Nocheluna Sotol', 'Lenny Kravitz', 'Alcoholic Beverages', 'A Mexican spirit distilled from the sotol plant, rooted in North Mexican heritage.', 2022, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://www.nocheluna.com/'),
  (350, 'Sláinte Irish Whiskey', 'Liev Schreiber & Richard Davies', 'Alcoholic Beverages', 'A premium Irish whiskey brand that donates funds to humanitarian causes.', 2022, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://slaintewhiskey.com/'),
  (351, 'The Finnish Long Drink', 'Miles Teller & Others', 'Alcoholic Beverages', 'A gin-based ready-to-drink cocktail inspired by a Finnish classic.', 2018, NULL, false, 'Actor/Film Producer', NULL, NULL, '2025-04-04T04:10:44.590806', '2025-04-04T04:10:44.590806', 'https://thelongdrink.com/');