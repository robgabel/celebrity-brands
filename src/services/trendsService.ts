export interface TrendData {
  timestamp: string;
  value: number;
}

export interface TrendResponse {
  interest: TrendData[];
  averageInterest: number;
  maxInterest: number;
  minInterest: number;
}

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { data: TrendResponse; timestamp: number }>();

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  try {
    // Check cache first
    const cacheKey = brandName.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached trends for:', brandName);
      return cached.data;
    }

    console.log('Fetching fresh trends for:', brandName);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trends`;
    const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch trends: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the results
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  } catch (error: any) {
    console.error('Error fetching trends:', {
      error: error.message,
      brandName
    });

    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    throw new Error(error.message || 'Failed to fetch trend data');
  }
}