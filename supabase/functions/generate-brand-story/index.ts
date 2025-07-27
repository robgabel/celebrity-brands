import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

interface RequestData {
  brandId: number;
  notes?: string;
  version?: 'v1' | 'v2';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function getPrompt(brand: any, version: 'v1' | 'v2', notes?: string): string {
  const baseInfo = `
${notes ? `IMPORTANT FOCUS AREA: ${notes}\n\n` : ''}
Brand Name: ${brand.name}
Creators: ${brand.creators}
Description: ${brand.description}
Year Founded: ${brand.year_founded}
Product Category: ${brand.product_category}
Type of Influencer: ${brand.type_of_influencer}`;

  if (version === 'v2') {
    return `Create an inspiring "Zero to Hero" brand story for:
${baseInfo}

Create a compelling narrative that:
1. Starts with the humble beginnings/origin story
2. Details the key turning points and breakthrough moments
3. Highlights major challenges overcome
4. Showcases current success and market impact
${notes ? '5. Specifically addresses the emphasized points\n' : ''}

Focus on the transformative journey from initial concept to current success.

Respond with a JSON object containing:
{
  "summary": "brief one-sentence summary of the brand's journey",
  "full_story": ["paragraph 1", "paragraph 2", "paragraph 3", ...],
  "key_events": ["breakthrough moment 1", "challenge overcome 2", ...],
  "metrics": {
    "initial_state": "description of starting point",
    "breakthrough_moment": "key turning point",
    "current_impact": "market presence and influence",
    ${notes ? '"focus_area_impact": "analysis of emphasized points",' : ''}
    "success_factors": "key elements that enabled success"
  }
}`;
  }

  // Version 1 - Classic Format
  return `Analyze this brand and create a compelling brand story:
${baseInfo}

Create a brand story that:
1. Captures the essence and journey of the brand
${notes ? '2. Specifically addresses and analyzes the emphasized points\n' : ''}
${notes ? '3. ' : '2. '}Highlights key milestones and achievements
${notes ? '4. ' : '3. '}Discusses market impact and influence
${notes ? '5. ' : '4. '}Analyzes success factors and challenges

Respond with a JSON object containing:
{
  "summary": "brief one-sentence summary of the brand",
  "full_story": ["paragraph 1", "paragraph 2", "paragraph 3", ...],
  "key_events": ["event 1", "event 2", ...],
  "metrics": {
    "key_metric_1": "value",
    "key_metric_2": "value",
    ${notes ? '"focus_area_impact": "analysis of emphasized points",' : ''}
    "market_impact": "description of market influence"
  }
}`;
}

Deno.serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204
      });
    }

    console.log('🚀 Brand story generation function started');

    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('🔧 Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      openAiKey: !!openAiKey
    });

    if (!supabaseUrl || !supabaseKey || !openAiKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    // Get request data
    let requestData: RequestData;
    try {
      requestData = await req.json();
      console.log('📥 Request data received:', {
        brandId: requestData.brandId,
        hasNotes: !!requestData.notes,
        version: requestData.version || 'v1'
      });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { brandId, notes, version = 'v1' } = requestData;

    if (!brandId) {
      console.error('❌ No brand ID provided');
      throw new Error('Brand ID is required');
    }

    // Initialize Supabase client with service role key
    console.log('🗄️ Initializing Supabase client with service role...');
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          }
        }
      }
    );

    // Get brand data
    console.log('🔍 Fetching brand details for ID:', brandId);
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError) {
      console.error('❌ Database fetch error:', {
        message: brandError.message,
        details: brandError.details,
        hint: brandError.hint,
        code: brandError.code
      });
      throw new Error(`Failed to fetch brand details: ${brandError.message}`);
    }

    if (!brand) {
      console.error('❌ Brand not found for ID:', brandId);
      throw new Error('Brand not found');
    }

    console.log('✅ Brand details fetched:', {
      name: brand.name,
      creators: brand.creators,
      hasDescription: !!brand.description
    });

    // Generate the appropriate prompt
    console.log('📝 Generating prompt for version:', version);
    const prompt = getPrompt(brand, version, notes);

    // Call OpenAI API
    console.log('🤖 Calling OpenAI API...');
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
            content: version === 'v2' 
              ? 'You are a brand storyteller specializing in inspirational "Zero to Hero" narratives that highlight transformative journeys and breakthrough moments. Always respond with valid JSON only.'
              : 'You are a brand analyst and storyteller, skilled at crafting compelling narratives about brands and their journeys. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', {
        status: openAIResponse.status,
        statusText: openAIResponse.statusText,
        errorText: errorText.substring(0, 500)
      });
      
      let errorMessage = `OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const completion = await openAIResponse.json();
    console.log('✅ OpenAI response received');

    if (!completion.choices?.[0]?.message?.content) {
      console.error('❌ No content in OpenAI response');
      throw new Error('No content received from OpenAI');
    }

    // Parse the story content
    let storyContent;
    try {
      // Strip markdown code block delimiters before parsing JSON
      const content = completion.choices[0].message.content
        .replace(/^```json\n/, '')
        .replace(/^```\n/, '')
        .replace(/\n```$/, '')
        .trim();

      storyContent = JSON.parse(content);
      console.log('✅ Story content parsed successfully:', {
        hasSummary: !!storyContent.summary,
        hasFullStory: !!storyContent.full_story,
        hasKeyEvents: !!storyContent.key_events,
        hasMetrics: !!storyContent.metrics
      });
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', {
        parseError: parseError.message,
        content: completion.choices[0].message.content.substring(0, 500)
      });
      throw new Error('Invalid response format from OpenAI');
    }

    // Update brand story in database with detailed error handling
    console.log('💾 Updating brand story in database...');
    console.log('📊 Story data being saved:', {
      brandId,
      storyLength: JSON.stringify(storyContent).length,
      version,
      hasNotes: !!notes
    });

    const { data: updateResult, error: updateError } = await supabaseClient
      .from('brands')
      .update({
        brand_story: storyContent,
        last_story_update: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)
      .select('id, brand_story, last_story_update');

    if (updateError) {
      console.error('❌ Supabase update error:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        brandId: brandId
      });
      
      // Provide specific error messages based on error codes
      let userFriendlyError = 'Failed to save brand story to database';
      if (updateError.code === '42501') {
        userFriendlyError = 'Permission denied: Unable to update brand story';
      } else if (updateError.code === 'PGRST301') {
        userFriendlyError = 'Database connection failed';
      } else if (updateError.message.includes('policy')) {
        userFriendlyError = 'Database security policy prevented the update';
      }
      
      throw new Error(`${userFriendlyError}: ${updateError.message}`);
    }

    console.log('✅ Brand story updated successfully:', {
      brandId,
      updateResult: updateResult?.[0] ? {
        id: updateResult[0].id,
        hasStory: !!updateResult[0].brand_story,
        lastUpdate: updateResult[0].last_story_update
      } : 'No result returned'
    });

    // Verify the update by fetching the brand again
    console.log('🔍 Verifying update...');
    const { data: verifyBrand, error: verifyError } = await supabaseClient
      .from('brands')
      .select('brand_story, last_story_update')
      .eq('id', brandId)
      .single();

    if (verifyError) {
      console.warn('⚠️ Could not verify update:', verifyError.message);
    } else {
      console.log('✅ Verification successful:', {
        hasStory: !!verifyBrand?.brand_story,
        lastUpdate: verifyBrand?.last_story_update,
        storySize: verifyBrand?.brand_story ? JSON.stringify(verifyBrand.brand_story).length : 0
      });
    }

    console.log('🎉 Brand story generation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      story: storyContent,
      version,
      brandId,
      message: `Brand story generated successfully using ${version === 'v2' ? 'Zero to Hero' : 'Classic'} format`
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('💥 Brand story generation error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Handle specific OpenAI errors
    if (error.message?.includes('rate limit') || error.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again in a few minutes.',
          success: false 
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Handle authentication errors
    if (error.message?.includes('API key') || error.status === 401) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed. Please contact support.',
          success: false 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred while generating the brand story',
        success: false,
      }),
      {
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});