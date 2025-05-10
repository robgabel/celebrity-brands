/*
  # Add new celebrity alcohol brands

  1. Changes
    - Adds new celebrity alcohol brands to the brands table
    - Ensures proper type_of_influencer values that match the constraint
    - Maintains data consistency with existing schema

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
  (352, 'Fleur du Mal Wines', 'Cara Delevingne', 'Alcoholic Beverages', 'A collection of premium French wines celebrating female empowerment and sustainability.', 2024, NULL, false, 'Model/Influencer', NULL, NULL, '2025-04-04T04:23:56.590806', '2025-04-04T04:23:56.590806', 'https://fleurdumalwines.com/'),
  (353, 'Próspero Tequila', 'Rita Ora', 'Alcoholic Beverages', 'A hand-crafted tequila made by master distiller Stella Anguiano at Don Roberto Distillery.', 2019, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:23:56.590806', '2025-04-04T04:23:56.590806', 'https://prosperotequila.com/'),
  (354, 'Heaven''s Door Spirits', 'Bob Dylan', 'Alcoholic Beverages', 'A collection of American whiskeys developed in collaboration with master distillers.', 2018, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:23:56.590806', '2025-04-04T04:23:56.590806', 'https://www.heavensdoor.com/'),
  (355, 'Villa One Tequila', 'Nick Jonas & John Varvatos', 'Alcoholic Beverages', 'A premium tequila crafted with sustainably sourced 100% blue weber agave.', 2019, NULL, false, 'Singer/Artist', NULL, NULL, '2025-04-04T04:23:56.590806', '2025-04-04T04:23:56.590806', 'https://villaonetequila.com/'),
  (356, 'Sweetens Cove', 'Peyton Manning & Andy Roddick', 'Alcoholic Beverages', 'A premium Tennessee bourbon named after the iconic 9-hole golf course.', 2020, NULL, false, 'Content Creator', NULL, NULL, '2025-04-04T04:23:56.590806', '2025-04-04T04:23:56.590806', 'https://sweetenscovespirits.com/');