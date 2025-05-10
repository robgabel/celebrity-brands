import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        // Rate limit hit - wait longer before retry
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 2000));
        continue;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Failed after retries');
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain');

    if (!domain) {
      throw new Error('Domain parameter is required');
    }

    // Get current ranking
    const currentResponse = await fetchWithRetry(
      `https://tranco-list.eu/api/ranks/domain/${encodeURIComponent(domain)}`,
      {
        headers: {
          'Authorization': '568584e0d0e147ddb15935fb549441b0',
          'Accept': 'application/json'
        }
      }
    );

    const currentData = await currentResponse.json();

    if (!currentData || typeof currentData.rank !== 'number') {
      return new Response(
        JSON.stringify({
          currentRank: null,
          historicalRanks: [],
          averageRank: null,
          bestRank: null,
          domainFound: false
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get historical data
    const historicalResponse = await fetchWithRetry(
      `https://tranco-list.eu/api/ranks/history/${encodeURIComponent(domain)}`,
      {
        headers: {
          'Authorization': '568584e0d0e147ddb15935fb549441b0',
          'Accept': 'application/json'
        }
      }
    );

    const historicalData = await historicalResponse.json();
    const historicalRanks = historicalData.map((item: any) => ({
      rank: item.rank,
      domain: domain,
      date: item.date
    }));

    const ranks = historicalRanks.map((h: any) => h.rank);
    const averageRank = ranks.length ? 
      Math.round(ranks.reduce((a: number, b: number) => a + b, 0) / ranks.length) : 
      null;
    const bestRank = ranks.length ? Math.min(...ranks) : null;

    return new Response(
      JSON.stringify({
        currentRank: currentData.rank,
        historicalRanks,
        averageRank,
        bestRank,
        domainFound: true
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in domain-ranking function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to fetch domain ranking',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});