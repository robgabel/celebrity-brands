import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Valid product categories from the database schema
const PRODUCT_CATEGORIES = [
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
  'Toys, Games & Children\'s Products'
];

// Valid influencer types from the database schema
const INFLUENCER_TYPES = [
  'Actor/Celebrity Influencer',
  'Actor/Film Producer',
  'Actor/Writer',
  'Actress/Entrepreneur',
  'Actress/Influencer',
  'Actress/Producer',
  'Actress/TV Personality',
  'Adventure/YouTube Influencer',
  'Animal/YouTuber',
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
  'Men\'s Lifestyle YouTuber',
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
];

const SYSTEM_PROMPT = `You are an expert researcher analyzing celebrity and influencer brands. Your task is to research and classify brands accurately using only the provided categories.

CRITICAL REQUIREMENTS:
1. ONLY use product categories from the provided list - DO NOT create new categories
2. ONLY use influencer types from the provided list - DO NOT create new types
3. DO NOT modify the approval_status field
4. Research thoroughly to find accurate information
5. Ensure all social media links are valid and current
6. Verify homepage URL is correct and active
7. Find a high-quality logo URL if available
8. Keep descriptions professional and factual
9. Format response as clean, valid JSON

Product Categories:
${JSON.stringify(PRODUCT_CATEGORIES, null, 2)}

Influencer Types:
${JSON.stringify(INFLUENCER_TYPES, null, 2)}

Response Format:
{
  "name": "Exact brand name",
  "creators": "Full name(s) of creator(s)",
  "product_category": "MUST match existing category exactly",
  "type_of_influencer": "MUST match existing type exactly",
  "description": "2-3 sentences about the brand",
  "year_founded": number,
  "year_discontinued": number or null,
  "brand_collab": boolean,
  "logo_url": "Valid URL or null",
  "homepage_url": "Valid URL or null",
  "social_links": {
    "instagram": "URL",
    "twitter": "URL",
    "tiktok": "URL",
    etc.
  }
}`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Required environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Get current brand data
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError) throw brandError;
    if (!brand) throw new Error('Brand not found');

    // Prepare prompt for GPT-4.1
    const prompt = `Research and analyze this brand:

Current Brand Data:
${JSON.stringify(brand, null, 2)}

Requirements:
1. Keep the brand name exactly as is
2. Research to verify and enhance all information
3. Find current social media links and homepage URL
4. Locate a high-quality logo URL if available
5. Select the most appropriate product category and influencer type from the provided lists
6. Write a clear, professional description
7. Keep any existing valid data, only improve or add missing information
8. Do not modify the approval_status

Ensure the response matches the required JSON format exactly.`;

    // Call GPT-4.1
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    // Parse and validate the response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate product category and influencer type
    if (!PRODUCT_CATEGORIES.includes(analysis.product_category)) {
      throw new Error(`Invalid product category: ${analysis.product_category}`);
    }
    if (!INFLUENCER_TYPES.includes(analysis.type_of_influencer)) {
      throw new Error(`Invalid influencer type: ${analysis.type_of_influencer}`);
    }

    // Preserve approval status
    const { approval_status } = brand;

    // Update brand in database
    const { error: updateError } = await supabase
      .from('brands')
      .update({
        ...analysis,
        approval_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        data: analysis
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in analyze-brands function:', error);

    const status = error.message.includes('not found') ? 404 :
                  error.message.includes('required') ? 400 : 500;

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to analyze brand',
        timestamp: new Date().toISOString()
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});