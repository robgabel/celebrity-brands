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

interface AnalysisResult {
  product_category: string;
  type_of_influencer: string;
}

// --- Main Analysis Logic ---
async function analyzeBrand(brand: { name: string; creators: string; description: string }): Promise<AnalysisResult> {
  const { name, creators, description } = brand;

  const systemPrompt = `
    You are an expert brand analyst. Your task is to analyze the provided brand
    details and classify the brand's "product_category" and "type_of_influencer".

    Respond with ONLY a valid JSON object containing two fields: "product_category"
    and "type_of_influencer".

    1. Choose the product category from ONLY these options:
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

    2. Choose the influencer type from ONLY these options:
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

    You must select the most appropriate option from each list. Do not create new categories or types.
  `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Brand Name: ${name}\nCreators: ${creators}\nDescription: ${description}` 
      },
    ],
    temperature: 0.1,
    max_tokens: 150,
    response_format: { type: 'json_object' }, // This enforces JSON output
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response received from OpenAI');
  }

  try {
    const analysis = JSON.parse(content) as AnalysisResult;
    
    // Validate that required fields are present
    if (!analysis.product_category || !analysis.type_of_influencer) {
      throw new Error('Missing required fields in analysis response');
    }
    
    return analysis;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid response format from OpenAI');
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

    // Perform analysis
    const analysis = await analyzeBrand(brand);

    // Update the brand with the analysis
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        product_category: analysis.product_category,
        type_of_influencer: analysis.type_of_influencer,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Failed to update brand with analysis');
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        brandId: brandId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Analysis function error:', error);

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