import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

interface RequestData {
  brandId: number;
  notes?: string;
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Get request data
    const { brandId, notes } = await req.json();

    if (!brandId) {
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get brand data
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      throw new Error('Brand not found');
    }

    // Prepare the story generation prompt
    const prompt = `Analyze this brand and create a compelling brand story:

${notes ? `IMPORTANT FOCUS AREA: ${notes}\n\n` : ''}
Brand Name: ${brand.name}
Creators: ${brand.creators}
Description: ${brand.description}
Year Founded: ${brand.year_founded}
Product Category: ${brand.product_category}
Type of Influencer: ${brand.type_of_influencer}

Create a brand story that:
1. Captures the essence and journey of the brand
${notes ? '2. Specifically addresses and analyzes the emphasized points\n' : ''}
${notes ? '3. ' : '2. '}Highlights key milestones and achievements
${notes ? '4. ' : '3. '}Discusses market impact and influence
${notes ? '5. ' : '4. '}Analyzes success factors and challenges

Respond with a JSON object containing:
{
  "story": "comprehensive brand story",
  "key_events": ["event 1", "event 2", ...],
  "metrics": {
    "key_metric_1": "value",
    "key_metric_2": "value",
    ${notes ? '"focus_area_impact": "analysis of emphasized points",' : ''}
  }
}`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: 'You are a brand analyst and storyteller, skilled at crafting compelling narratives about brands and their journeys.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error('Failed to generate brand story');
    }

    const completion = await openAIResponse.json();
    
    // Strip markdown code block delimiters before parsing JSON
    const content = completion.choices[0].message.content
      .replace(/^```json\n/, '')  // Remove opening ```json
      .replace(/^```\n/, '')      // Remove opening ``` (if no language specified)
      .replace(/\n```$/, '')      // Remove closing ```
      .trim();                    // Remove any extra whitespace

    const storyContent = JSON.parse(content);

    // Update brand story in database
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        brand_story: storyContent,
        last_story_update: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      throw new Error('Failed to update brand story');
    }

    return new Response(JSON.stringify(storyContent), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});