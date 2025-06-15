import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CandidateBrand {
  name: string;
  creators: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders },
      status: 204
    });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.instructions) {
      return new Response(
        JSON.stringify({ error: 'Research instructions are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { instructions } = body;

    // Initialize Supabase client to get existing brands
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    const { data: existingBrands } = await supabaseClient
      .from('brands')
      .select('name, creators')
      .eq('approval_status', 'approved');

    const existingBrandsList = existingBrands?.map(b => `${b.name} by ${b.creators}`).join(', ') || '';

    const prompt = `You are Petra, a research agent specializing in celebrity and creator brands. 

Research Instructions: ${instructions}

IMPORTANT: Do NOT include any of these existing brands in your results:
${existingBrandsList}

Find 5-8 NEW celebrity/creator brands that match the research criteria. For each brand, provide:
1. Brand name
2. Creator/founder name(s)
3. Brief description of the brand and what it offers

Focus on brands that are:
- Actually owned/founded by celebrities, creators, or influencers
- Currently active or recently launched
- Not already in our database
- Legitimate businesses (not just endorsements)

Respond with a JSON array of objects, each containing:
{
  "name": "Brand Name",
  "creators": "Creator Name(s)",
  "description": "Brief description of the brand and what it offers"
}

Only return the JSON array, no other text.`;

    // Call OpenAI API
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
            content: 'You are Petra, an expert research agent for celebrity and creator brands. Always respond with valid JSON arrays only.',
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
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const completion = await openAIResponse.json();
    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let candidates: CandidateBrand[];
    try {
      // Clean up the response in case it has markdown formatting
      const cleanContent = content
        .replace(/^```json\n/, '')
        .replace(/^```\n/, '')
        .replace(/\n```$/, '')
        .trim();
      
      candidates = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from research agent');
    }

    if (!Array.isArray(candidates)) {
      throw new Error('Expected array of candidate brands');
    }

    return new Response(JSON.stringify(candidates), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Research agent error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Research failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});