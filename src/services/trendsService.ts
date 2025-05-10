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

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`Fetching trends for "${brandName}" (attempt ${attempt}/${RETRY_ATTEMPTS})`);
      
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
      console.error(`Attempt ${attempt} failed:`, {
        error: error.message,
        query: brandName
      });

      // Don't retry on certain errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a minute.');
      }
      
      // If this isn't our last attempt, wait before retrying
      if (attempt < RETRY_ATTEMPTS) {
        const backoffDelay = RETRY_DELAY * Math.pow(2, attempt - 1);
        await delay(backoffDelay);
        continue;
      }
    }
  }

  // If we get here, all attempts failed
  throw new Error('Unable to fetch trend data after multiple attempts. Please try again later.');
}