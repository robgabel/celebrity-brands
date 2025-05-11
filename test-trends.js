const googleTrends = require('google-trends-api');

async function test() {
  try {
    console.log('Starting Google Trends API test...');
    
    const result = await googleTrends.interestOverTime({
      keyword: "Avaline Wine",
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      geo: 'US',
      timezone: 0,
      granularTimeResolution: false
    });

    console.log('Success! Raw response:', result);
    
    // Parse and display the data
    const data = JSON.parse(result);
    if (data.default?.timelineData) {
      console.log('\nProcessed data points:', data.default.timelineData.length);
      console.log('First data point:', data.default.timelineData[0]);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();