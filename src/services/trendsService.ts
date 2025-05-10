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

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const JITTER_FACTOR = 0.1;

function getRetryDelay(attempt: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  const jitter = exponentialDelay * JITTER_FACTOR * Math.random();
  return exponentialDelay + jitter;
}

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  try {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trends`;
        const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully received trends data');

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error);

        // Don't retry on certain errors
        if (
          error.message?.includes('rate limit') ||
          error.message?.includes('429') ||
          error.message?.includes('invalid') ||
          error.message?.includes('not found')
        ) {
          throw new Error('Rate limit exceeded. Please try again in a minute.');
        }

        // Continue to next retry attempt
        continue;
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
    
    if (error.message?.includes('timeout') || error.message?.includes('504')) {
      throw new Error('Request timed out. Please try again.');
    }

    // Return a more specific error message when possible
    throw new Error(
      error.message?.includes('fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Unable to fetch trend data. Please try again later.'
    );
  }
}