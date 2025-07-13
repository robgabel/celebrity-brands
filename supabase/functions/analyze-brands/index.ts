import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  product_category: string;
  type_of_influencer: string;
}

Deno.serve(async (req) => {
  // Always return proper CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders },
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

    // Validate request body
    const body = await req.json().catch(() => null);
    if (!body || !body.brandId) {
      return new Response(
        JSON.stringify({ 
          error: 'Brand ID is required' 
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
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
        JSON.stringify({ 
          error: 'Brand not found' 
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

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
2. type_of_influencer: The most appropriate type from the list`;

    // Get analysis from OpenAI using the modern API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
    }

    const completion = await openAIResponse.json();

    if (!completion.choices[0]?.message?.content) {
      throw new Error('No analysis received from OpenAI');
    }

    // Parse the response
    let analysis: AnalysisResult;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanContent = completion.choices[0].message.content
        .replace(/^```json\n/, '')
        .replace(/^```\n/, '')
        .replace(/\n```$/, '')
        .trim();
      
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', completion.choices[0].message.content);
      throw new Error('Invalid response format from OpenAI');
    }

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
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Brand analysis error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        success: false,
      }), {
        status: error.status || 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});