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

// Circuit breaker configuration
const CIRCUIT_WINDOW = 60000; // 1 minute
const ERROR_THRESHOLD = 5;
const RESET_TIMEOUT = 30000; // 30 seconds

// Retry configuration 
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 30000; // 30 seconds
const JITTER_FACTOR = 0.2;

// Circuit breaker state
let failureCount = 0;
let lastFailureTime = 0;
let circuitOpen = false;

function getRetryDelay(attempt: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  const jitter = exponentialDelay * JITTER_FACTOR * Math.random();
  return exponentialDelay + jitter;
}

function shouldOpenCircuit(): boolean {
  const now = Date.now();
  // Reset failure count if outside window
  if (now - lastFailureTime > CIRCUIT_WINDOW) {
    failureCount = 0;
    return false;
  }
  return failureCount >= ERROR_THRESHOLD;
}

function recordFailure(): void {
  const now = Date.now();
  if (now - lastFailureTime > CIRCUIT_WINDOW) {
    failureCount = 0;
  }
  failureCount++;
  lastFailureTime = now;
  
  if (shouldOpenCircuit()) {
    circuitOpen = true;
    setTimeout(() => {
      circuitOpen = false;
      failureCount = 0;
    }, RESET_TIMEOUT);
  }
}

export async function getBrandTrends(brandName: string): Promise<TrendResponse> {
  try {
    // Check circuit breaker
    if (circuitOpen) {
      throw new Error('Service temporarily unavailable. Please try again in 30 seconds.');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = getRetryDelay(attempt);
          console.log(`Retrying in ${Math.round(delay/1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trends`;
        const response = await fetch(`${apiUrl}?query=${encodeURIComponent(brandName)}`, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          recordFailure();
          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        // Reset circuit breaker on success
        failureCount = 0;

        return data;
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error);

        // Don't retry on specific errors
        if (
          error.message?.includes('rate limit') ||
          error.message?.includes('429') ||
          error.message?.includes('invalid') ||
          error.message?.includes('not found') ||
          error.message?.includes('temporarily unavailable')
        ) {
          recordFailure();
          throw error;
        }

        // Continue to next retry attempt
        continue;
      }
    }

    // If we get here, all attempts failed
    recordFailure();
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

    if (error.message?.includes('temporarily unavailable')) {
      throw error;
    }

    // Return a more specific error message when possible
    throw new Error(
      error.message?.includes('fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Unable to fetch trend data. Please try again later.'
    );
  }
}