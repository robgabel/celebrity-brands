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
1. NEVER suggest brands that are similar to existing ones in the exclusion list:
   - Check brand names for similar spellings or variations
   - Check creator names for variations (e.g., "LeBron James" vs "Lebron James Sr.")
   - Check product categories and descriptions for similar offerings
   - If in doubt about similarity, exclude the brand

2. For each potential brand, verify:
   - The brand actually exists and is currently active
   - The celebrity/influencer has a significant ownership stake (not just endorsement)
   - The brand name and ownership information is accurate
   - The brand is not a subsidiary or variant of an existing brand

3. Return response in this EXACT format:
{
  "candidates": [
    {
      "name": "Exact brand name",
      "creators": "Full name(s) of the celebrity/influencer owner(s)",
      "description": "1-2 sentences about the brand",
      "verification": {
        "ownership_confirmed": true,
        "ownership_source": "Source URL or reference",
        "active_status": true,
        "launch_date": "YYYY-MM or YYYY"
      }
    }
  ]
}

4. Return a maximum of 10 candidates that meet ALL criteria:
   - name: Exact brand name
   - creators: Full name(s) of the celebrity/influencer owner(s)
   - description: 1-2 sentences about the brand
   - verification: Proof of ownership and active status

IMPORTANT:
- Check each brand against the exclusion list using fuzzy matching
- Verify ownership through multiple sources when possible
- Exclude brands where ownership is unclear or disputed
- Prioritize brands with clear launch dates and verifiable information
- If a brand seems similar to an excluded one, err on the side of caution`;

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

    // Enhanced exclusion list with categories
    const exclusionContext = existingBrands
      ?.map(b => ({
        name: b.name,
        creators: b.creators,
        category: b.product_category
      }))
      .reduce((acc, brand) => {
        acc[brand.category] = acc[brand.category] || [];
        acc[brand.category].push(`${brand.name} (by ${brand.creators})`);
        return acc;
      }, {} as Record<string, string[]>);

    const formattedExclusions = Object.entries(exclusionContext || {})
      .map(([category, brands]) => 
        `${category}:\n${brands.map(b => `- ${b}`).join('\n')}`
      )
      .join('\n\n');

    // Call GPT-4.1
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Find potential brands based on these instructions:

${instructions}

IMPORTANT: Check against these existing brands by category:

${formattedExclusions}

Remember to:
1. CAREFULLY check for similar brands in each category
2. Verify actual ownership (not just endorsement)
3. Include verification details for each suggestion
4. Maximum 10 results
5. If unsure about similarity, exclude the brand`
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
        if (!candidate.verification || typeof candidate.verification !== 'object') {
          throw new Error('Invalid or missing verification object');
        }
        if (typeof candidate.verification.ownership_confirmed !== 'boolean') {
          throw new Error('Invalid or missing ownership confirmation');
        }
        if (!candidate.verification.ownership_source) {
          throw new Error('Missing ownership source');
        }
      }

      // Filter out candidates without confirmed ownership
      candidates = candidates.filter(c => c.verification.ownership_confirmed);
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