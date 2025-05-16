import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { Configuration, OpenAIApi } from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SYSTEM_PROMPT = `You are a business journalist writing for Fortune magazine. 
Write a compelling narrative about the brand, focusing on:
- Core business and products/services
- Target customer demographics
- Key competitors
- Origin story and founding
- Celebrity/creator involvement
- Critical business decisions, setbacks, and successes
- Marketing strategy, especially celebrity/influencer involvement
- Unique value proposition
- Business metrics if available
- Future growth prospects

Write in a professional, journalistic style. Be specific and detailed.
Format the response as a JSON object with these keys:
- summary: A brief 2-3 sentence overview
- full_story: The complete narrative
- metrics: Any concrete business metrics mentioned
- key_events: Array of important milestones
`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { brandId } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError) throw brandError;
    if (!brand) throw new Error('Brand not found');

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });
    const openai = new OpenAIApi(configuration);

    // Generate story
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a story about ${brand.name}, founded by ${brand.creators} in ${brand.year_founded}. 
          Product category: ${brand.product_category}
          Description: ${brand.description}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const story = JSON.parse(completion.choices[0].message.content);

    // Store the story in the database
    const { error: updateError } = await supabase
      .from('brands')
      .update({ 
        brand_story: story,
        last_story_update: new Date().toISOString()
      })
      .eq('id', brandId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify(story),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error generating brand story:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate brand story'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});