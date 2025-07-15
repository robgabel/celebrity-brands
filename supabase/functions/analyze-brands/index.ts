import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import OpenAI from 'npm:openai@4';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FullAnalysisResult {
  product_category: string;
  type_of_influencer: string;
  year_founded: number | null;
  year_discontinued: number | null;
  description: string;
  brand_collab: boolean;
  logo_url: string | null;
  homepage_url: string | null;
  social_links: Record<string, string> | null;
}

// --- Main Analysis Logic ---
async function analyzeBrand(brand: { name: string; creators: string; description: string }): Promise<FullAnalysisResult> {
  const { name, creators, description } = brand;

  // First call: Get factual data with low temperature
  const factualSystemPrompt = `
    You are an expert brand analyst. Your task is to analyze the provided brand
    details and provide factual information about the brand.

    Respond with ONLY a valid JSON object containing ALL of the following fields:

    1. "product_category" - Choose from ONLY these options:
    - Alcoholic Beverages
    - Beauty & Personal Care
    - Beauty & Personal Care (Fragrance)
    - Cannabis & CBD
    - Entertainment & Media
    - Fashion & Apparel
    - Food & Soft Drinks
    - Health & Fitness
    - Home & Lifestyle
    - Sporting Goods & Outdoor Gear
    - Sports & Esports
    - Tech & Electronics
    - Tech & Software
    - Toys, Games & Children's Products

    2. "type_of_influencer" - Choose from ONLY these options:
    - Actor/Celebrity Influencer
    - Actor/Film Producer
    - Actor/Writer
    - Actress/Entrepreneur
    - Actress/Influencer
    - Actress/Producer
    - Actress/TV Personality
    - Adventure/YouTube Influencer
    - Animal/YouTuber
    - Athlete/Influencer
    - Beauty Influencer
    - Beauty YouTuber
    - Beauty/LGBTQ+ Influencer
    - Beauty/Lifestyle YouTuber
    - Beauty/Nail YouTuber
    - Beauty/YouTube Influencer
    - Blogger-Turned-Entrepreneur
    - Celebrity Hairstylist/Influencer
    - Chef/TV Personality
    - Chef/TV Personality/Influencer
    - Comedy YouTubers
    - Comedy/YouTube Influencer
    - Content Creator
    - DIY YouTubers
    - DIY/YouTube Influencer
    - Dancer/YouTube Influencer
    - Esports/YouTuber
    - Family/Gaming YouTubers
    - Family/Hair Tutorial YouTuber
    - Fashion Blogger/Influencer
    - Fashion Influencer
    - Fashion/Beauty YouTuber
    - Fashion/Parenting Influencer
    - Fashion/YouTube Influencer
    - Fitness Athlete/Influencer
    - Fitness Influencer
    - Food Blogger/Influencer
    - Food Blogger/YouTuber
    - Food Influencer
    - Food/Instagram Influencer
    - Food/Nutrition YouTuber
    - Former Pro Player/Streamer
    - Former YouTuber
    - Gaming Content Creator
    - Gaming YouTuber
    - Gaming YouTubers
    - Gaming/Esports Influencers
    - Gaming/YouTube Influencer
    - Health/Food YouTuber
    - Instagram Influencer/Photographer
    - Instagram Meme Influencer
    - Interior Designer/TV Personality
    - Kids/YouTube Influencer
    - Kids/YouTube Influencers
    - Lifestyle Influencer
    - Lifestyle YouTuber
    - Lifestyle/Beauty Influencer
    - Lifestyle/Beauty Influencers
    - Lifestyle/Beauty YouTuber
    - Lifestyle/YouTube Influencer
    - Makeup Artist/Influencer
    - Men's Lifestyle YouTuber
    - Model/Beauty Influencer
    - Model/Influencer
    - Musicians/Influencers
    - Musicians/K-Pop Influencers
    - News/YouTuber
    - Pet/Instagram Influencer
    - Podcast Host
    - Rapper/Entertainer
    - Rapper/Entrepreneur
    - Rapper/Entrepreneur Influencer
    - Rapper/Influencer
    - Reality TV Star/Influencer
    - Reality TV/Entrepreneur
    - Reality TV/Influencer
    - Reality/Model Influencer
    - Science YouTuber
    - Singer/Artist
    - Singer/Artist Influencer
    - Singer/Dancer
    - Singer/Entertainer
    - Singer/Entertainer Influencer
    - Singer/Global Influencer
    - Singer/Influencer
    - Singer/Pop Culture Influencer
    - Singer/Pop Influencer
    - Singer/Reality Star
    - Singer/Songwriter
    - Singer/TV Personality
    - Skincare YouTuber
    - Spanish Gaming Influencer
    - Sports/YouTube Influencer
    - Stylist/Fashion Influencer
    - Tech YouTuber
    - TikToker
    - TikToker/Influencer
    - TikTokers
    - Travel/Lifestyle YouTuber
    - Travel/Minimalism YouTuber
    - TV Host/Comedian
    - TV Host/Comedian Influencer
    - TV Host/Culinary Influencer
    - TV Host/Influencer
    - TV Personality/Author
    - TV Personality/Influencer
    - Twitch Streamers/Influencers
    - Vegan/YouTube Influencer
    - Wellness Influencer
    - YouTuber
    - YouTuber/Baker
    - YouTuber/Comedian
    - YouTuber/Designer
    - YouTuber/Filmmaker
    - YouTuber/Gaming
    - YouTuber/Influencer
    - YouTuber/Musician
    - YouTuber/Philanthropist
    - YouTuber/Podcaster
    - YouTubers/Adventurers
    - YouTubers/Boxers
    - YouTubers/Comedians
    - YouTubers/Gaming Influencers
    - YouTubers/Pranksters

    3. "year_founded" - The year the brand was founded (number) or null if unknown
    4. "year_discontinued" - The year the brand was discontinued (number) or null if still active/unknown
    5. "brand_collab" - Boolean (true/false) indicating if this is a collaboration brand or the creator's own brand
    6. "logo_url" - A valid URL to the brand's official logo image or null if not found
    7. "homepage_url" - A valid URL to the brand's official website or null if not found
    8. "social_links" - A JSON object with social media platform names as keys and their URLs as values, or null if none found. Use lowercase platform names like "instagram", "twitter", "tiktok", "youtube", "facebook", "linkedin"

    IMPORTANT GUIDELINES:
    - For URLs, only provide valid, working URLs from official sources
    - For social_links, only include platforms that actually exist for the brand
    - For brand_collab: true = collaboration with another brand/company, false = creator's own brand
    - If you cannot find reliable information for a field, use null for optional fields
    - All fields must be present in the response, even if some are null

    You must select the most appropriate option from each list. Do not create new categories or types.
  `;

  console.log('🔍 Starting factual analysis with low temperature (0.1)...');

  // Get factual data with low temperature (0.1)
  const factualCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: factualSystemPrompt },
      { 
        role: 'user', 
        content: `Brand Name: ${name}\nCreators: ${creators}\nDescription: ${description}` 
      },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const factualContent = factualCompletion.choices[0]?.message?.content;
  if (!factualContent) {
    throw new Error('No factual response received from OpenAI');
  }

  let factualAnalysis;
  try {
    factualAnalysis = JSON.parse(factualContent);
    console.log('✅ Factual analysis completed successfully');
  } catch (parseError) {
    console.error('Failed to parse OpenAI factual response:', factualContent);
    throw new Error('Invalid factual response format from OpenAI');
  }

  // Second call: Get creative description with higher temperature
  const descriptionSystemPrompt = `
    You are a creative brand copywriter. Create a compelling, concise description for this brand.
    
    Requirements:
    - Write exactly ONE sentence
    - Use 10-20 words total
    - Make it engaging and descriptive
    - Focus on what the brand offers and what makes it unique
    - Be creative but accurate
    
    Respond with ONLY a JSON object containing:
    {
      "description": "your creative description here"
    }
  `;

  console.log('🎨 Starting creative description with higher temperature (0.7)...');

  const descriptionCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: descriptionSystemPrompt },
      { 
        role: 'user', 
        content: `Brand Name: ${name}\nCreators: ${creators}\nDescription: ${description}` 
      },
    ],
    temperature: 0.7, // Higher temperature for more creative descriptions
    max_tokens: 100,
    response_format: { type: 'json_object' },
  });

  const descriptionContent = descriptionCompletion.choices[0]?.message?.content;
  if (!descriptionContent) {
    throw new Error('No description response received from OpenAI');
  }

  let descriptionAnalysis;
  try {
    descriptionAnalysis = JSON.parse(descriptionContent);
    console.log('✅ Creative description completed successfully');
  } catch (parseError) {
    console.error('Failed to parse OpenAI description response:', descriptionContent);
    throw new Error('Invalid description response format from OpenAI');
  }

  // Combine the results
  const analysis: FullAnalysisResult = {
    ...factualAnalysis,
    description: descriptionAnalysis.description
  };

  console.log('🔄 Validating and cleaning analysis results...');

  try {
    
    // Validate that required fields are present
    if (!analysis.product_category || !analysis.type_of_influencer) {
      throw new Error('Missing required fields in analysis response');
    }

    // Validate data types and formats
    if (analysis.year_founded !== null && (typeof analysis.year_founded !== 'number' || analysis.year_founded < 1800 || analysis.year_founded > new Date().getFullYear())) {
      analysis.year_founded = null;
    }

    if (analysis.year_discontinued !== null && (typeof analysis.year_discontinued !== 'number' || analysis.year_discontinued < 1800 || analysis.year_discontinued > new Date().getFullYear())) {
      analysis.year_discontinued = null;
    }

    if (typeof analysis.description !== 'string' || analysis.description.length === 0) {
      throw new Error('Invalid description format');
    }

    if (typeof analysis.brand_collab !== 'boolean') {
      analysis.brand_collab = false; // Default to false if not properly set
    }

    // Validate URLs
    if (analysis.logo_url && !isValidUrl(analysis.logo_url)) {
      analysis.logo_url = null;
    }

    if (analysis.homepage_url && !isValidUrl(analysis.homepage_url)) {
      analysis.homepage_url = null;
    }

    // Validate social links
    if (analysis.social_links) {
      if (typeof analysis.social_links !== 'object' || Array.isArray(analysis.social_links)) {
        analysis.social_links = null;
      } else {
        // Filter out invalid URLs from social links
        const validSocialLinks: Record<string, string> = {};
        for (const [platform, url] of Object.entries(analysis.social_links)) {
          if (typeof url === 'string' && isValidUrl(url)) {
            validSocialLinks[platform.toLowerCase()] = url;
          }
        }
        analysis.social_links = Object.keys(validSocialLinks).length > 0 ? validSocialLinks : null;
      }
    }
    
    console.log('✅ Analysis validation completed successfully');
    console.log('📊 Final analysis summary:', {
      product_category: analysis.product_category,
      type_of_influencer: analysis.type_of_influencer,
      description_length: analysis.description.length,
      has_homepage: !!analysis.homepage_url,
      social_platforms: analysis.social_links ? Object.keys(analysis.social_links).length : 0
    });
    
    return analysis;
  } catch (parseError) {
    console.error('Failed to validate analysis:', parseError);
    throw new Error('Invalid response format from OpenAI');
  }
}

// Helper function to validate URLs
function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// --- Main Server Logic ---
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log('🚀 Analyze-brands function started');

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      throw new Error('Missing required environment variables');
    }

    // Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body || !body.brandId) {
      return new Response(
        JSON.stringify({ error: 'Brand ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { brandId } = body;
    console.log('📋 Processing brand ID:', brandId);

    // Initialize Supabase client
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Fetch brand details
    console.log('🔍 Fetching brand details from database...');
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('name, creators, description')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('Database fetch error:', brandError);
      throw new Error('Failed to fetch brand details');
    }

    if (!brand) {
      return new Response(
        JSON.stringify({ error: 'Brand not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Brand details fetched:', {
      name: brand.name,
      creators: brand.creators,
      description_length: brand.description?.length || 0
    });

    // Perform analysis with dual temperature approach
    console.log('🤖 Starting dual-temperature AI analysis...');
    const analysis = await analyzeBrand(brand);

    // Update the brand with the comprehensive analysis
    console.log('💾 Updating brand in database with analysis results...');
    console.log('📊 Analysis data being saved:', {
      brandId,
      product_category: analysis.product_category,
      type_of_influencer: analysis.type_of_influencer,
      year_founded: analysis.year_founded,
      year_discontinued: analysis.year_discontinued,
      description_preview: analysis.description.substring(0, 50) + '...',
      brand_collab: analysis.brand_collab,
      has_logo_url: !!analysis.logo_url,
      has_homepage_url: !!analysis.homepage_url,
      social_platforms: analysis.social_links ? Object.keys(analysis.social_links) : []
    });
    
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        product_category: analysis.product_category,
        type_of_influencer: analysis.type_of_influencer,
        year_founded: analysis.year_founded,
        year_discontinued: analysis.year_discontinued,
        description: analysis.description,
        brand_collab: analysis.brand_collab,
        logo_url: analysis.logo_url,
        homepage_url: analysis.homepage_url,
        social_links: analysis.social_links,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Database update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      throw new Error(`Failed to update brand with analysis: ${updateError.message}`);
    }

    console.log('✅ Brand successfully updated in database');
    console.log('🎉 Analysis completed successfully for brand ID:', brandId);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        brandId: brandId,
        message: 'Brand analysis completed with dual-temperature approach'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('💥 Analysis function error:', error);

    // Handle specific OpenAI errors
    if (error.message?.includes('rate limit') || error.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        success: false,
      }),
      {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});