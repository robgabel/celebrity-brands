import { supabase } from '../lib/supabase';

export interface DomainRanking {
  rank: number;
  domain: string;
  date: string;
}

export interface RankingResponse {
  currentRank: number | null;
  historicalRanks: DomainRanking[];
  averageRank: number | null;
  bestRank: number | null;
  domainFound: boolean;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_KEY_PREFIX = 'domain_ranking_';

export async function getDomainRanking(brandDomain: string): Promise<RankingResponse> {
  try {
    // Check cache first
    const cacheKey = `${CACHE_KEY_PREFIX}${brandDomain}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // Extract domain from URL if needed
    const domain = brandDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/domain-ranking`;
    const response = await fetch(`${apiUrl}?domain=${encodeURIComponent(domain)}`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch domain ranking');
    }

    const data = await response.json();

    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    return data;
  } catch (error: any) {
    console.error('Error fetching domain ranking:', error);
    throw new Error(error.message || 'Failed to fetch domain ranking');
  }
}