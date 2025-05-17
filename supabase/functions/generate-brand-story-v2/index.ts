import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SYSTEM_PROMPT = `You are a business journalist writing for Fortune magazine. 
Your task is to write a compelling "From Zero to Hero" narrative about the brand, following this exact structure:

Part 1: The Spark & The Stakes
1. Create a catchy title that includes the brand name and hints at its transformation
2. Write a compelling hook that draws readers in
3. Explain the genesis - why this brand, why that moment
4. Introduce the founders and their initial challenges

Part 2: The Grind & The Glimmer
5. Detail the early hustle and first breakthroughs
6. Highlight the game-changing moment that accelerated growth

Part 3: The Ascent & The Arrival
7. Describe how they navigated growth and overcame scaling challenges
8. Analyze their unique appeal and what makes them stand out
9. Showcase significant achievements and industry impact

Part 4: The Wisdom & The Horizon
10. Present 3-5 key business lessons from their journey
11. Outline future vision and ongoing challenges

CRITICAL REQUIREMENTS:
- Research thoroughly using available data about the brand, founders, and market
- Include specific dates, numbers, and verifiable facts where possible
- Maintain journalistic integrity while telling an engaging story
- Use industry context to frame the brand's achievements
- Focus on concrete examples and specific details
- Ensure each section builds upon the previous one
- Create smooth transitions between sections
- End with a thought-provoking statement about the brand's future

Format the response as a JSON object with these keys:
{
  "summary": "A brief 2-3 sentence overview",
  "full_story": ["First paragraph", "Second paragraph", "Third paragraph", ...],
  "metrics": {"metric1": "value1", "metric2": "value2"},
  "key_events": ["Event 1", "Event 2", "Event 3"],
  "lessons_learned": ["Lesson 1", "Lesson 2", "Lesson 3"],
  "future_outlook": {
    "vision": "Brief statement of future vision",
    "challenges": ["Challenge 1", "Challenge 2"],
    "opportunities": ["Opportunity 1", "Opportunity 2"]
  }
}

IMPORTANT:
- The full_story MUST follow the exact 4-part structure outlined above
- Each paragraph should be substantial (150-200 words)
- Include specific dates, metrics, and milestones whenever possible
- Maintain a clear narrative arc that shows the brand's transformation
- End each section with a strong transition to the next
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Generate story
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write a "From Zero to Hero" story about ${brand.name}, founded by ${brand.creators} in ${brand.year_founded}.

Brand Details:
- Product Category: ${brand.product_category}
- Description: ${brand.description}
- Type of Influencer: ${brand.type_of_influencer}
- Brand Type: ${brand.brand_collab ? 'Collaboration Brand' : 'Own Brand'}

Focus on creating a detailed narrative that explores the brand's journey, market impact, and future potential.
Follow the exact 4-part structure to show their transformation from startup to success.
Research thoroughly and include specific dates, metrics, and milestones.
End with clear lessons learned and a compelling vision for the future.`
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
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
      }).trim(),
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