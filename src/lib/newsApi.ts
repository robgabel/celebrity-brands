const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: NewsArticle[]; timestamp: number }>();

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
    // Check cache first
    const cacheKey = brandName.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached news for:', brandName);
      return cached.data;
    }

    console.log('Fetching fresh news for:', brandName);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/news?brand=${encodeURIComponent(brandName)}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch news: ${response.status}`);
    }

    const articles = await response.json();
    
    // Cache the results
    cache.set(cacheKey, {
      data: articles,
      timestamp: Date.now()
    });

    console.log('Processed articles:', articles.length);
    return articles;
  } catch (error: any) {
    console.error('Error fetching news:', error);

    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    throw new Error(error.message || 'Failed to fetch news articles');
  }
}