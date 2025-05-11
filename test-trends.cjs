const googleTrends = require('google-trends-api');

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
    
    const result = await Promise.race([
      googleTrends.interestOverTime(params),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 30s')), 30000)
      )
    ]);

    console.log('Received response, parsing data...');
    
    // Parse and display the data
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