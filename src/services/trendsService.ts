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

export interface TrendError {
  error: string;
  timestamp: string;
  retryAfter?: number;
}

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  try {
    console.log('Fetching trends for:', brandName);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trends`;
    const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error || 'Failed to fetch trend data');
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    console.log('Successfully received trends data');

    return data;
  } catch (error: any) {
    console.error('Error fetching trends:', {
      error: error.message,
      stack: error.stack,
      query: brandName,
      status: (error as any).status
    });

    // Provide user-friendly error message based on status code
    if ((error as any).status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    } else if ((error as any).status === 504) {
      throw new Error('Request timed out. Please try again.');
    } else {
      throw new Error('Unable to fetch trend data. Please try again later.');
    }
  }
}