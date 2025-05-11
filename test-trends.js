import googleTrends from 'google-trends-api';

const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // 2 seconds
const MAX_DELAY = 30000; // 30 seconds
const REQUEST_TIMEOUT = 60000; // 60 seconds

function addJitter(delay) {
  const JITTER_MAX = 1000; // Maximum jitter in milliseconds
  return delay + Math.random() * JITTER_MAX;
}

async function fetchWithRetry(params, retryCount = 0) {
  try {
    console.log(`Attempt ${retryCount + 1}/${MAX_RETRIES} for query: "${params.keyword}"`);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), REQUEST_TIMEOUT);
    });

    const apiPromise = googleTrends.interestOverTime(params);
    const result = await Promise.race([apiPromise, timeoutPromise]);

    // Validate the response format
    try {
      const parsed = JSON.parse(result);
      if (!parsed?.default?.timelineData) {
        throw new Error('Invalid response format from Google Trends API');
      }
    } catch (parseError) {
      throw new Error('Invalid response format from Google Trends API');
    }

    return result;
  } catch (error) {
    console.error(`Attempt ${retryCount + 1} failed:`, error);

    // Check for specific error conditions that warrant a retry
    const shouldRetry = (
      retryCount < MAX_RETRIES &&
      (error.message?.includes('stringify') ||
       error.message?.includes('quota') ||
       error.message?.includes('timeout') ||
       error.message?.includes('ETIMEDOUT') ||
       error.message?.includes('temporarily unavailable') ||
       error.message?.includes('<!DOCTYPE html>') ||
       error.message?.includes('<html') ||
       error.message?.includes('ECONNRESET') ||
       error.message?.includes('socket hang up'))
    );

    if (shouldRetry) {
      const baseDelay = Math.min(INITIAL_DELAY * Math.pow(2, retryCount), MAX_DELAY);
      const delay = addJitter(baseDelay);
      console.log(`Retrying "${params.keyword}" in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(params, retryCount + 1);
    }

    throw error;
  }
}

async function test() {
  console.log('Starting test at:', new Date().toISOString());
  console.log('Setting up request parameters...');

  const startTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const params = {
    keyword: "weather", // Using a simpler test query
    startTime: startTime,
    geo: 'US',
    timezone: 0,
    granularTimeResolution: false
  };

  console.log('Request parameters:', JSON.stringify(params, null, 2));

  try {
    console.log('Making API request...');
    const result = await fetchWithRetry(params);

    console.log('Received response, parsing data...');
    const data = JSON.parse(result);
    if (data.default?.timelineData) {
      console.log('Successfully parsed response');
      console.log('Total data points:', data.default.timelineData.length);
      console.log('Sample data point:', JSON.stringify(data.default.timelineData[0], null, 2));
    } else {
      console.log('Warning: Unexpected response format:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Error occurred:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
  console.log('Test completed at:', new Date().toISOString());
}

console.log('Script started');
test().catch(err => console.error('Unhandled error:', err));
console.log('Test initiated');