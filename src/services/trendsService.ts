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

const RETRY_ATTEMPTS = 5; // Increased from 3 to 5 for temporary service issues
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  try {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`Fetching trends for "${brandName}" (attempt ${attempt + 1}/${MAX_RETRIES})`);

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trends`;
        const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully received trends data');

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error);

        // Don't retry on rate limit errors
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again in a minute.');
        }

        // If not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
      }
    }

    // If we get here, all attempts failed
    if (lastError) {
      throw lastError;
    }

    throw new Error('Failed to fetch trend data after multiple attempts');
  } catch (error: any) {
    console.error('Error fetching trends:', {
      error: error.message,
      brandName
    });

    // Return user-friendly error messages
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    if (error.message.includes('timeout') || error.message.includes('504')) {
      throw new Error('Request timed out. Please try again.');
    }

    throw new Error('Unable to fetch trend data. Please try again later.');
  }
}