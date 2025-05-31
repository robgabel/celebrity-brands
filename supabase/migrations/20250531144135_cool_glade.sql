/*
  # Add missing indexes and constraints

  1. New Indexes
    - Add index on brands.homepage_url for faster URL lookups
    - Add index on brands.wikipedia_url for faster URL lookups
    - Add index on brands.name (case-insensitive) for better search performance
    - Add index on brands.creators (case-insensitive) for better search performance
    
  2. Constraints
    - Add check constraint for valid approval_status values
    - Add check constraint for valid product categories
    - Add check constraint for valid founder types
*/

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_brands_homepage_url ON public.brands(homepage_url);
CREATE INDEX IF NOT EXISTS idx_brands_wikipedia_url ON public.brands(wikipedia_url);
CREATE INDEX IF NOT EXISTS idx_brands_name_lower ON public.brands(lower(name));
CREATE INDEX IF NOT EXISTS idx_brands_creators_lower ON public.brands(lower(creators));

-- Add check constraints with proper validation
DO $$ BEGIN
  -- Check if approval_status constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_approval_status'
  ) THEN
    ALTER TABLE public.brands
    ADD CONSTRAINT valid_approval_status
    CHECK (approval_status = ANY (ARRAY['pending', 'approved', 'rejected']));
  END IF;

  -- Check if product_category constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_product_categories'
  ) THEN
    ALTER TABLE public.brands
    ADD CONSTRAINT valid_product_categories
    CHECK (
      product_category IS NULL OR
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
  END IF;

  -- Check if type_of_influencer constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_founder_types'
  ) THEN
    ALTER TABLE public.brands
    ADD CONSTRAINT valid_founder_types
    CHECK (
      type_of_influencer = ANY (ARRAY[
        'Actor/Celebrity Influencer',
        'Actor/Film Producer',
        'Actor/Writer',
        'Actress/Entrepreneur',
        'Actress/Influencer',
        'Actress/Producer',
        'Actress/TV Personality',
        'Adventure/YouTube Influencer',
        'Animal/YouTuber',
        'Athlete/Influencer',
        'Beauty Influencer',
        'Beauty YouTuber',
        'Beauty/LGBTQ+ Influencer',
        'Beauty/Lifestyle YouTuber',
        'Beauty/Nail YouTuber',
        'Beauty/YouTube Influencer',
        'Blogger-Turned-Entrepreneur',
        'Celebrity Hairstylist/Influencer',
        'Chef/TV Personality',
        'Chef/TV Personality/Influencer',
        'Comedy YouTubers',
        'Comedy/YouTube Influencer',
        'Content Creator',
        'DIY YouTubers',
        'DIY/YouTube Influencer',
        'Dancer/YouTube Influencer',
        'Esports/YouTuber',
        'Family/Gaming YouTubers',
        'Family/Hair Tutorial YouTuber',
        'Fashion Blogger/Influencer',
        'Fashion Influencer',
        'Fashion/Beauty YouTuber',
        'Fashion/Parenting Influencer',
        'Fashion/YouTube Influencer',
        'Fitness Athlete/Influencer',
        'Fitness Influencer',
        'Food Blogger/Influencer',
        'Food Blogger/YouTuber',
        'Food Influencer',
        'Food/Instagram Influencer',
        'Food/Nutrition YouTuber',
        'Former Pro Player/Streamer',
        'Former YouTuber',
        'Gaming Content Creator',
        'Gaming YouTuber',
        'Gaming YouTubers',
        'Gaming/Esports Influencers',
        'Gaming/YouTube Influencer',
        'Health/Food YouTuber',
        'Instagram Influencer/Photographer',
        'Instagram Meme Influencer',
        'Interior Designer/TV Personality',
        'Kids/YouTube Influencer',
        'Kids/YouTube Influencers',
        'Lifestyle Influencer',
        'Lifestyle YouTuber',
        'Lifestyle/Beauty Influencer',
        'Lifestyle/Beauty Influencers',
        'Lifestyle/Beauty YouTuber',
        'Lifestyle/YouTube Influencer',
        'Makeup Artist/Influencer',
        'Men''s Lifestyle YouTuber',
        'Model/Beauty Influencer',
        'Model/Influencer',
        'Musicians/Influencers',
        'Musicians/K-Pop Influencers',
        'News/YouTuber',
        'Pet/Instagram Influencer',
        'Podcast Host',
        'Rapper/Entertainer',
        'Rapper/Entrepreneur',
        'Rapper/Entrepreneur Influencer',
        'Rapper/Influencer',
        'Reality TV Star/Influencer',
        'Reality TV/Entrepreneur',
        'Reality TV/Influencer',
        'Reality/Model Influencer',
        'Science YouTuber',
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
        'Singer/TV Personality',
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
        'TV Host/Comedian',
        'TV Host/Comedian Influencer',
        'TV Host/Culinary Influencer',
        'TV Host/Influencer',
        'TV Personality/Author',
        'TV Personality/Influencer',
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
        'YouTubers/Pranksters'
      ])
    );
  END IF;
END $$;