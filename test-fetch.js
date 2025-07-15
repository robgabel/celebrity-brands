import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testFetch() {
  console.log('Testing raw fetch to Supabase...');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Anon Key (first 5 chars):', supabaseAnonKey ? supabaseAnonKey.substring(0, 5) : 'N/A');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables.');
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/brands?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fetch failed with status ${response.status}: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('Fetch successful! Received data (first item):', data[0]);
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

testFetch();