import { supabase } from '../lib/supabase';

export interface ShortenedUrl {
  shortCode: string;
  url: string;
  shortUrl: string;
}

export async function shortenUrl(url: string): Promise<ShortenedUrl> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/url-shortener`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to shorten URL');
    }

    return response.json();
  } catch (error: any) {
    console.error('Error shortening URL:', error);
    throw new Error(error.message || 'Failed to shorten URL');
  }
}