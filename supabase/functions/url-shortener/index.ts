import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a random short code
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method === 'POST') {
      // Create short URL
      const { url } = await req.json();
      
      if (!url) {
        throw new Error('URL is required');
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL');
      }

      // Generate unique short code
      let shortCode;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        shortCode = generateShortCode();
        const { data, error } = await supabase
          .from('short_urls')
          .select('id')
          .eq('id', shortCode)
          .single();

        if (!data && !error) {
          break;
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique short code');
      }

      // Get user ID if authenticated
      const authHeader = req.headers.get('Authorization');
      let userId = null;

      if (authHeader) {
        const { data: { user }, error } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (!error && user) {
          userId = user.id;
        }
      }

      // Insert the short URL
      const { data, error } = await supabase
        .from('short_urls')
        .insert({
          id: shortCode,
          url: url,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          shortCode: data.id,
          url: data.url,
          shortUrl: `${supabaseUrl}/functions/v1/url-shortener/${data.id}`
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } else if (req.method === 'GET') {
      // Handle redirect
      const shortCode = new URL(req.url).pathname.split('/').pop();
      
      if (!shortCode) {
        throw new Error('Short code is required');
      }

      // Get the URL and increment clicks
      const { data, error } = await supabase
        .from('short_urls')
        .select('url')
        .eq('id', shortCode)
        .single();

      if (error || !data) {
        throw new Error('Short URL not found');
      }

      // Increment clicks in background
      supabase
        .from('short_urls')
        .update({ clicks: supabase.sql`clicks + 1` })
        .eq('id', shortCode)
        .then();

      // Redirect to the original URL
      return new Response(null, {
        status: 302,
        headers: {
          'Location': data.url,
          ...corsHeaders
        }
      });
    }

    throw new Error('Method not allowed');
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      { 
        status: error.message === 'Short URL not found' ? 404 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});