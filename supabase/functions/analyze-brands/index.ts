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

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: openAiKey,
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
[Your existing influencer type options...]

Respond with ONLY a JSON object containing two fields:
1. product_category: The most appropriate category from the list
2. type_of_influencer: The most appropriate type from the list`;

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