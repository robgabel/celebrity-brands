import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface NewsArticle {
  title: string;
  url: string;
  description: string;
  image_url: string | null;
  published_at: string;
  source: string;
}

export async function getBrandNews(brandName: string): Promise<NewsArticle[]> {
  try {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch news: ${response.status}`);
    }

    const articles = await response.json();

    console.log('Processed articles:', articles.length);
    return articles;
  } catch (error: any) {
    console.error('Error fetching news:', {
      error: error.message
    });

    if (error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    throw new Error('Failed to fetch news articles');
  }
}