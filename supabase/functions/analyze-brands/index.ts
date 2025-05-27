import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { Configuration, OpenAIApi } from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  product_category: string;
  type_of_influencer: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
      throw brandError;
    }

    if (!brand) {
      throw new Error('Brand not found');
    }

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Prepare the analysis prompt
    const prompt = `Analyze this brand and categorize it:

Brand Name: ${brand.name}
Creators: ${brand.creators}
Description: ${brand.description}

1. Determine the product category from ONLY these options:
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

2. Determine the type of influencer from ONLY these options:
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

Respond with ONLY a JSON object containing two fields:
1. product_category: The most appropriate category from the list
2. type_of_influencer: The most appropriate type from the list

Example response:
{
  "product_category": "Beauty & Personal Care",
  "type_of_influencer": "Beauty Influencer"
}`;

    // Get analysis from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a brand analysis expert. Analyze the brand and respond with the requested JSON format only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No analysis received from OpenAI');
    }

    // Parse the response
    const analysis: AnalysisResult = JSON.parse(completion.choices[0].message.content);

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
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});