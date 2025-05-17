import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SYSTEM_PROMPT = `You are an expert market researcher specializing in celebrity and influencer brands. Your task is to find potential new brands based on the administrator's instructions.

CRITICAL REQUIREMENTS:
1. Only return brands that are OWNED or CO-OWNED by celebrities/influencers
2. Exclude any brands where celebrities are ONLY endorsers or ambassadors
3. Focus on finding LEGITIMATE, VERIFIABLE brands
4. Return a maximum of 10 candidates
5. Format response as a JSON array of objects with:
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
      throw new Error('Instructions are required');
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Required environment variables are not set');
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
3. Return results as a JSON array
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
      const parsed = JSON.parse(content);
      candidates = Array.isArray(parsed.candidates) ? parsed.candidates : parsed;
      
      // Validate each candidate has required fields
      candidates = candidates.filter(c => 
        c.name && 
        c.creators && 
        c.description &&
        typeof c.name === 'string' &&
        typeof c.creators === 'string' &&
        typeof c.description === 'string'
      );
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from OpenAI');
    }

    return new Response(
      JSON.stringify(candidates),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
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
          'Content-Type': 'application/json'
        }
      }
    );
  }
});