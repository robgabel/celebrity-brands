import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

const SYSTEM_PROMPT = `You are an expert market researcher specializing in celebrity and influencer brands. Your task is to find potential new brands based on the administrator's instructions.

CRITICAL REQUIREMENTS:
1. Return response in this EXACT format:
{
  "candidates": [
    {
      "name": "Exact brand name",
      "creators": "Full name(s) of the celebrity/influencer owner(s)",
      "description": "1-2 sentences about the brand"
    }
  ]
}

2. Only return brands that are OWNED or CO-OWNED by celebrities/influencers
3. Exclude any brands where celebrities are ONLY endorsers or ambassadors
4. Focus on finding LEGITIMATE, VERIFIABLE brands
5. Return a maximum of 10 candidates in the array with:
   - name: Exact brand name
   - creators: Full name(s) of the celebrity/influencer owner(s)
   - description: 1-2 sentences about the brand

IMPORTANT:
- Exclude any brands in the provided exclusion list
- Double-check that creators are actual owners, not just endorsers
- Prioritize newer or less well-known brands that match the criteria
- Ensure descriptions are factual and professional`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { instructions } = await req.json();

    if (!instructions) {
      return new Response(
        JSON.stringify({
          error: 'Instructions are required',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      return new Response(
        JSON.stringify({
          error: 'Service configuration error',
          timestamp: new Date().toISOString()
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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Get existing brands for exclusion list
    const { data: existingBrands, error: brandsError } = await supabase
      .from('brands')
      .select('name, creators');

    if (brandsError) throw brandsError;

    // Format exclusion list for the prompt
    const exclusionList = existingBrands
      ?.map(b => `${b.name} (by ${b.creators})`)
      .join('\n');

    // Call GPT-4.1
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Find potential brands based on these instructions:

${instructions}

Exclude these existing brands:
${exclusionList}

Remember to:
1. Only include brands actually OWNED by celebrities/influencers
2. Verify ownership claims
3. Return results in the exact JSON format specified
4. Maximum 10 results`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    // Parse and validate the response
    let candidates;
    try {
      const response = JSON.parse(content);
      
      if (!response.candidates || !Array.isArray(response.candidates)) {
        throw new Error('Response missing candidates array');
      }
      
      candidates = response.candidates;
      
      // Validate each candidate has required fields
      for (const candidate of candidates) {
        if (!candidate.name || typeof candidate.name !== 'string') {
          throw new Error('Invalid or missing name field');
        }
        if (!candidate.creators || typeof candidate.creators !== 'string') {
          throw new Error('Invalid or missing creators field');
        }
        if (!candidate.description || typeof candidate.description !== 'string') {
          throw new Error('Invalid or missing description field');
        }
      }
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error(`Invalid response format from OpenAI: ${error.message}`);
    }

    return new Response(
      JSON.stringify(candidates),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  } catch (error) {
    console.error('Error in research-agent-petra function:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to complete research',
        timestamp: new Date().toISOString()
      }),
      {
        status: error.message.includes('required') ? 400 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
});