import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

// JWT verification helper
async function verifyJWT(authHeader: string | null, supabaseUrl: string, supabaseKey: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Create a client to verify the JWT
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new Error('Invalid or expired token');
    }
    return user;
  } catch (error) {
    throw new Error('Authentication failed');
  }
}

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
    return `Write an article of up to 700 words telling the complete story of the ${brand.name} brand led by ${brand.creators}.

Start by introducing the founder(s), their relevant background, achievements, and early influences that shaped their approach to launching the brand.

Explain the motivations for starting the brand, including personal inspirations and identified market needs.

Trace the formation of the company, strategic partnerships or collaborations, key individuals involved, initial product/service offerings, company structure, and go-to-market strategy.

Outline how the brand expanded over time geographically, including key markets and distribution channels such as retail, online, or global partnerships.

Include major milestones like product launches, awards, media moments, and pop culture influences that boosted growth and recognition.

Discuss business performance metrics where available (sales, market share, growth rates) and operational challenges faced, explaining how these were addressed to maintain growth.

Conclude with forward-looking insights on plans for product line expansion, new markets, sustainability or innovation initiatives, and strategic priorities for competitive advantage.

${notes ? `IMPORTANT: Pay special attention to and emphasize: ${notes}\n\n` : ''}

Ensure the narrative is clear, cohesive, and provides practical entrepreneurial and market strategy insights without speculation. Use reliable data to support the account. Format with short paragraphs and bullet points to enhance readability.

Respond with a JSON object containing:
{
  "summary": "brief one-sentence summary of the brand's journey and current status",
  "full_story": ["paragraph 1", "paragraph 2", "paragraph 3", ...],
  "key_events": ["milestone 1", "milestone 2", ...],
  "metrics": {
    "founder_background": "relevant background and achievements",
    "market_opportunity": "identified market needs and motivations",
    "business_model": "company structure and go-to-market strategy",
    "expansion_strategy": "geographic and distribution growth",
    "performance_data": "business metrics and growth indicators",
    ${notes ? '"focus_area_insights": "analysis of emphasized points",' : ''}
    "future_outlook": "strategic priorities and growth plans"
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
    const perplexityKey = Deno.env.get('PERPLEXITY_API_KEY');

    console.log('🔧 Environment check:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      openAiKey: !!openAiKey,
      perplexityKey: !!perplexityKey
    });

    if (!supabaseUrl || !supabaseKey || !openAiKey || !perplexityKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    // Verify JWT authentication
    console.log('🔐 Verifying user authentication...');
    const authHeader = req.headers.get('Authorization');
    const user = await verifyJWT(authHeader, supabaseUrl, supabaseKey);
    console.log('✅ User authenticated:', { userId: user.id, email: user.email });

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

    // Call appropriate API based on version
    let completion;
    
    if (version === 'v2') {
      // Use Perplexity API for V2
      console.log('🤖 Calling Perplexity API...');
      const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-deep-research',
          messages: [
            {
              role: 'system',
              content: 'You are writing a clear, engaging, and factually accurate memo aimed at creators launching their own businesses. Use simple language appropriate for a 10th grade reading level. Your goal is to deliver a compelling, chronological story of a creator-led or celebrity-founded brand. Blend business insights with storytelling focused on entrepreneurship, market strategy, and brand growth. Avoid speculation; use verifiable data and reliable sources only. Use short paragraphs and bullets for easy scanning. Always respond with valid JSON only.',
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

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('❌ Perplexity API error:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          errorText: errorText.substring(0, 500)
        });
        
        let errorMessage = `Perplexity API error: ${apiResponse.status} ${apiResponse.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      completion = await apiResponse.json();
      console.log('✅ Perplexity response received');
    } else {
      // Use OpenAI API for V1
      console.log('🤖 Calling OpenAI API...');
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: 'You are a brand analyst and storyteller, skilled at crafting compelling narratives about brands and their journeys. Always respond with valid JSON only.',
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

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('❌ OpenAI API error:', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          errorText: errorText.substring(0, 500)
        });
        
        let errorMessage = `OpenAI API error: ${apiResponse.status} ${apiResponse.statusText}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      completion = await apiResponse.json();
      console.log('✅ OpenAI response received');
    }

    if (!completion.choices?.[0]?.message?.content) {
      console.error(`❌ No content in ${version === 'v2' ? 'Perplexity' : 'OpenAI'} response`);
      throw new Error(`No content received from ${version === 'v2' ? 'Perplexity' : 'OpenAI'}`);
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
      throw new Error(`Invalid response format from ${version === 'v2' ? 'Perplexity' : 'OpenAI'}`);
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