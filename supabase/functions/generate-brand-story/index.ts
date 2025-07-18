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
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a brand analyst and storyteller, skilled at crafting compelling narratives about brands and their journeys. Always respond with valid JSON only.',
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
      const errorText = await openAIResponse.text();
      let errorMessage = `OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        // Use errorText as is if JSON parsing fails
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
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
    console.log('Attempting to update brand_story for brandId:', brandId);
    console.log('Story content being saved (first 200 chars):', JSON.stringify(storyContent).substring(0, 200) + '...');
    console.log('Full story content structure:', {
      hasStory: !!storyContent.story,
      hasKeyEvents: !!storyContent.key_events,
      hasMetrics: !!storyContent.metrics,
      storyLength: storyContent.story?.length || 0,
      keyEventsCount: storyContent.key_events?.length || 0
    });
    
    const { error: updateError } = await supabaseClient
      .from('brands')
      .update({
        brand_story: storyContent,
        last_story_update: new Date().toISOString(),
      })
      .eq('id', brandId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      console.error('Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      throw new Error('Failed to update brand story: ' + updateError.message);
    } else {
      console.log('Brand story updated successfully for brandId:', brandId);
      console.log('Update timestamp:', new Date().toISOString());
      
      // Verify the update by fetching the brand again
      const { data: verifyBrand, error: verifyError } = await supabaseClient
        .from('brands')
        .select('brand_story, last_story_update')
        .eq('id', brandId)
        .single();
      
      if (verifyError) {
        console.error('Error verifying update:', verifyError);
      } else {
        console.log('Verification - brand_story exists:', !!verifyBrand?.brand_story);
        console.log('Verification - last_story_update:', verifyBrand?.last_story_update);
        if (verifyBrand?.brand_story) {
          console.log('Verification - story content length:', JSON.stringify(verifyBrand.brand_story).length);
        }
      }
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