import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SYSTEM_PROMPT = `You are a business journalist writing for Fortune magazine. 
Write a comprehensive, in-depth narrative about the brand. Your story must thoroughly cover:

  Each section must be wrapped in HTML tags:
  - Section headers must be wrapped in <h3> tags
  - Paragraphs must be wrapped in <p> tags
  
  Cover these topics:
  
  - Core business and products/services 
  * Detailed product lines and offerings
  * Quality standards and manufacturing
  * Pricing strategy and market positioning

- Target customer demographics
  * Primary and secondary audiences
  * Customer behavior and preferences
  * Market segmentation

- Key competitors
  * Direct and indirect competition
  * Competitive advantages
  * Market share analysis

- Origin story and founding
  * Detailed founding timeline
  * Initial challenges and solutions
  * Early business model evolution

- Celebrity/creator involvement
  * Role in product development
  * Creative direction influence
  * Brand ambassador activities

- Critical business decisions, setbacks, and successes
  * Major pivots and strategic changes
  * Growth milestones
  * Challenges overcome

- Marketing strategy, especially celebrity/influencer involvement
  * Campaign highlights
  * Social media presence
  * Influencer partnerships

- Unique value proposition
  * Brand differentiation
  * Core values and mission
  * Customer benefits

- Business metrics if available
  * Growth indicators
  * Market performance
  * Sales achievements

- Future growth prospects
  * Expansion plans
  * Market opportunities
  * Innovation pipeline

Write in a professional, journalistic style that combines thorough research with engaging storytelling.
Each paragraph should focus on a specific aspect while maintaining narrative flow.
Use concrete examples, specific details, and industry context throughout.
Aim for at least 6-8 well-developed paragraphs that tell a complete story.

Format the response as a JSON object with these keys:
{
  "summary": "A brief 2-3 sentence overview",
  "full_story": ["<h3>Section Title</h3>", "<p>First paragraph</p>", "<h3>Next Section</h3>", "<p>Next paragraph</p>", ...],
  "metrics": {"metric1": "value1", "metric2": "value2"},
  "key_events": ["Event 1", "Event 2", "Event 3"]
}

The full_story MUST be an array of HTML-wrapped content, alternating between <h3> headers and <p> paragraphs.
Each paragraph should be substantial (100-200 words) and focus on a specific aspect.
Ensure smooth transitions between paragraphs to maintain narrative flow.
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
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Write a comprehensive brand story about ${brand.name}, founded by ${brand.creators} in ${brand.year_founded}.

Brand Details:
- Product Category: ${brand.product_category}
- Description: ${brand.description}
- Type of Influencer: ${brand.type_of_influencer}
- Brand Type: ${brand.brand_collab ? 'Collaboration Brand' : 'Own Brand'}

Focus on creating a detailed narrative that explores the brand's journey, market impact, and future potential.
Break the story into clear, substantial paragraphs that each focus on different aspects while maintaining a cohesive narrative flow.`
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