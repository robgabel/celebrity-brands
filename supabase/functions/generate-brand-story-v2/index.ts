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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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

    // Prepare the story generation prompt with "Zero to Hero" focus
    const prompt = `Create an inspiring "Zero to Hero" brand story for:

${notes ? `IMPORTANT FOCUS AREA: ${notes}\n\n` : ''}
Brand Name: ${brand.name}
Creators: ${brand.creators}
Description: ${brand.description}
Year Founded: ${brand.year_founded}
Product Category: ${brand.product_category}
Type of Influencer: ${brand.type_of_influencer}

Create a compelling narrative that:
1. Starts with the humble beginnings/origin story
2. Details the key turning points and breakthrough moments
3. Highlights major challenges overcome
4. Showcases current success and market impact
${notes ? '5. Specifically addresses the emphasized points\n' : ''}

Focus on the transformative journey from initial concept to current success.

Respond with a JSON object containing:
{
  "story": "comprehensive brand story in a Zero to Hero narrative arc",
  "key_events": ["breakthrough moment 1", "challenge overcome 2", ...],
  "metrics": {
    "initial_state": "description of starting point",
    "breakthrough_moment": "key turning point",
    "current_impact": "market presence and influence",
    ${notes ? '"focus_area_impact": "analysis of emphasized points",' : ''}
    "success_factors": "key elements that enabled success"
  }
}`;

    // Call OpenAI API with GPT-4o model
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: 'You are a brand storyteller specializing in inspirational "Zero to Hero" narratives that highlight transformative journeys and breakthrough moments.',
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