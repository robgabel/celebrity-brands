export interface TrendData {
  timestamp: string;
  value: number;
}

export interface TrendResponse {
  interest: TrendData[];
  averageInterest: number;
  maxInterest: number;
  minInterest: number;
  articleTitle: string;
  source: string;
}

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: TrendResponse; timestamp: number }>();

export async function getWikipediaPageViews(brandName: string): Promise<TrendResponse> {
  try {
    // Check cache first
    const cacheKey = brandName.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached page views for:', brandName);
      return cached.data;
    }

    console.log('Fetching fresh page views for:', brandName);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wikipedia-pageviews`;
    const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}&_=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 404) {
        return {
          interest: [],
          averageInterest: 0,
          maxInterest: 0,
          minInterest: 0,
          articleTitle: brandName,
          source: 'Wikipedia Page Views',
          dataAvailable: false
        };
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few minutes.');
      }
      
      throw new Error(errorData.error || `Failed to fetch page views: ${response.status}`);
    }

    const data = await response.json();
    data.dataAvailable = true;
    
    // Cache the results
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error: any) {
    console.error('Error fetching page views:', {
      error: error.message,
      brandName
    });

    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Unable to connect to Wikipedia service. Please try again later.');
    }

    if (error.message?.includes('not found')) {
      throw new Error(`No Wikipedia data available for "${brandName}"`);
    } else if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please try again in a few minutes.');
    }
    
    throw new Error('Unable to fetch trend data. Please try again later.');
  }
}