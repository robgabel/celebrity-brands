/*
  # Update founder types constraint

  1. Changes
    - Drop the existing valid_founder_types constraint
    - Add new constraint with simplified influencer types
    - Update existing records to map to new categories

  2. Security
    - No changes to RLS policies needed
*/

-- First, let's see what the current constraint looks like and drop it
ALTER TABLE brands DROP CONSTRAINT IF EXISTS valid_founder_types;

-- Add the new simplified constraint
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

-- Update existing records to map old detailed types to new simplified types
-- This is a comprehensive mapping of the old types to new ones

UPDATE brands SET type_of_influencer = 'Actor' 
WHERE type_of_influencer IN (
  'Actor/Celebrity Influencer',
  'Actor/Film Producer', 
  'Actor/Writer',
  'Actress/Entrepreneur',
  'Actress/Influencer',
  'Actress/Producer',
  'Actress/TV Personality'
);

UPDATE brands SET type_of_influencer = 'Athlete'
WHERE type_of_influencer IN (
  'Athlete/Influencer',
  'Former Pro Player/Streamer'
);

UPDATE brands SET type_of_influencer = 'Digital Creator'
WHERE type_of_influencer IN (
  'Beauty Influencer',
  'Beauty YouTuber',
  'Beauty/LGBTQ+ Influencer',
  'Beauty/Lifestyle YouTuber',
  'Beauty/Nail YouTuber',
  'Beauty/YouTube Influencer',
  'Blogger-Turned-Entrepreneur',
  'Comedy YouTubers',
  'Comedy/YouTube Influencer',
  'Content Creator',
  'DIY YouTubers',
  'DIY/YouTube Influencer',
  'Family/Gaming YouTubers',
  'Family/Hair Tutorial YouTuber',
  'Fashion Blogger/Influencer',
  'Fashion Influencer',
  'Fashion/Beauty YouTuber',
  'Fashion/Parenting Influencer',
  'Fashion/YouTube Influencer',
  'Food Blogger/Influencer',
  'Food Blogger/YouTuber',
  'Food Influencer',
  'Food/Instagram Influencer',
  'Food/Nutrition YouTuber',
  'Gaming Content Creator',
  'Gaming YouTuber',
  'Gaming YouTubers',
  'Gaming/Esports Influencers',
  'Gaming/YouTube Influencer',
  'Health/Food YouTuber',
  'Instagram Influencer/Photographer',
  'Instagram Meme Influencer',
  'Kids/YouTube Influencer',
  'Kids/YouTube Influencers',
  'Lifestyle Influencer',
  'Lifestyle YouTuber',
  'Lifestyle/Beauty Influencer',
  'Lifestyle/Beauty Influencers',
  'Lifestyle/Beauty YouTuber',
  'Lifestyle/YouTube Influencer',
  'Men''s Lifestyle YouTuber',
  'Model/Beauty Influencer',
  'Model/Influencer',
  'News/YouTuber',
  'Pet/Instagram Influencer',
  'Science YouTuber',
  'Skincare YouTuber',
  'Spanish Gaming Influencer',
  'Sports/YouTube Influencer',
  'Stylist/Fashion Influencer',
  'Tech YouTuber',
  'TikToker',
  'TikToker/Influencer',
  'TikTokers',
  'Travel/Lifestyle YouTuber',
  'Travel/Minimalism YouTuber',
  'Twitch Streamers/Influencers',
  'Vegan/YouTube Influencer',
  'Wellness Influencer',
  'YouTuber',
  'YouTuber/Baker',
  'YouTuber/Comedian',
  'YouTuber/Designer',
  'YouTuber/Filmmaker',
  'YouTuber/Gaming',
  'YouTuber/Influencer',
  'YouTuber/Musician',
  'YouTuber/Philanthropist',
  'YouTuber/Podcaster',
  'YouTubers/Adventurers',
  'YouTubers/Boxers',
  'YouTubers/Comedians',
  'YouTubers/Gaming Influencers',
  'YouTubers/Pranksters',
  'Former YouTuber'
);

UPDATE brands SET type_of_influencer = 'Gamer'
WHERE type_of_influencer IN (
  'Esports/YouTuber'
);

UPDATE brands SET type_of_influencer = 'Musician'
WHERE type_of_influencer IN (
  'Musicians/Influencers',
  'Musicians/K-Pop Influencers',
  'Rapper/Entertainer',
  'Rapper/Entrepreneur',
  'Rapper/Entrepreneur Influencer',
  'Rapper/Influencer',
  'Singer/Artist',
  'Singer/Artist Influencer',
  'Singer/Dancer',
  'Singer/Entertainer',
  'Singer/Entertainer Influencer',
  'Singer/Global Influencer',
  'Singer/Influencer',
  'Singer/Pop Culture Influencer',
  'Singer/Pop Influencer',
  'Singer/Reality Star',
  'Singer/Songwriter',
  'Singer/TV Personality'
);

UPDATE brands SET type_of_influencer = 'TV/Media Personality'
WHERE type_of_influencer IN (
  'TV Host/Comedian',
  'TV Host/Comedian Influencer',
  'TV Host/Culinary Influencer',
  'TV Host/Influencer',
  'TV Personality/Author',
  'TV Personality/Influencer',
  'Interior Designer/TV Personality'
);

UPDATE brands SET type_of_influencer = 'Public Figure'
WHERE type_of_influencer IN (
  'Reality TV Star/Influencer',
  'Reality TV/Entrepreneur',
  'Reality TV/Influencer',
  'Reality/Model Influencer',
  'Celebrity Hairstylist/Influencer',
  'Makeup Artist/Influencer',
  'Podcast Host'
);

UPDATE brands SET type_of_influencer = 'Chef'
WHERE type_of_influencer IN (
  'Chef/TV Personality',
  'Chef/TV Personality/Influencer'
);

UPDATE brands SET type_of_influencer = 'Dancer'
WHERE type_of_influencer IN (
  'Dancer/YouTube Influencer'
);

UPDATE brands SET type_of_influencer = 'Athlete'
WHERE type_of_influencer IN (
  'Fitness Athlete/Influencer',
  'Fitness Influencer',
  'Adventure/YouTube Influencer',
  'Animal/YouTuber'
);

-- Handle any remaining unmapped types by setting them to 'Public Figure' as a catch-all
UPDATE brands SET type_of_influencer = 'Public Figure'
WHERE type_of_influencer NOT IN (
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
) AND type_of_influencer IS NOT NULL;