import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

// Metric weights
const WEIGHTS = {
  search_interest: 0.4,    // 40% weight for search trends
  news_mentions: 0.3,      // 30% weight for news coverage
  domain_rank: 0.2,        // 20% weight for domain authority
  social_mentions: 0.1     // 10% weight for social media presence
};

// Normalization ranges for each metric
const RANGES = {
  search_interest: { min: 0, max: 100 },
  news_mentions: { min: 0, max: 50 },
  domain_rank: { min: 1, max: 1000000 },
  social_mentions: { min: 0, max: 1000 }
};

function normalizeValue(value: number, metric: keyof typeof RANGES): number {
  const range = RANGES[metric];
  const normalized = (value - range.min) / (range.max - range.min);
  return Math.max(0, Math.min(1, normalized)) * 100;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recent metrics (last 24 hours)
    const { data: metrics, error: metricsError } = await supabase
      .from('brand_metrics')
      .select('brand_id, metric_type, metric_value')
      .gte('collected_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (metricsError) throw metricsError;

    // Group metrics by brand
    const brandMetrics = new Map<number, Record<string, number>>();
    metrics?.forEach(metric => {
      if (!brandMetrics.has(metric.brand_id)) {
        brandMetrics.set(metric.brand_id, {});
      }
      const brand = brandMetrics.get(metric.brand_id)!;
      brand[metric.metric_type] = metric.metric_value;
    });

    // Calculate scores
    const scores = Array.from(brandMetrics.entries()).map(([brandId, metrics]) => {
      let score = 0;
      
      // Add weighted normalized scores for each metric
      if (metrics.search_interest !== undefined) {
        score += normalizeValue(metrics.search_interest, 'search_interest') * WEIGHTS.search_interest;
      }
      if (metrics.news_mentions !== undefined) {
        score += normalizeValue(metrics.news_mentions, 'news_mentions') * WEIGHTS.news_mentions;
      }
      if (metrics.domain_rank !== undefined) {
        // Invert domain rank since lower is better
        const invertedRank = RANGES.domain_rank.max - metrics.domain_rank;
        score += normalizeValue(invertedRank, 'domain_rank') * WEIGHTS.domain_rank;
      }
      if (metrics.social_mentions !== undefined) {
        score += normalizeValue(metrics.social_mentions, 'social_mentions') * WEIGHTS.social_mentions;
      }

      return {
        brand_id: brandId,
        score: Number(score.toFixed(2))
      };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Get previous rankings for trend calculation
    const { data: prevRankings } = await supabase
      .from('brand_rankings')
      .select('brand_id, rank')
      .order('computed_at', { ascending: false })
      .limit(1);

    const prevRanks = new Map(prevRankings?.map(r => [r.brand_id, r.rank]) || []);

    // Clear existing rankings
    const { error: truncateError } = await supabase
      .from('brand_rankings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (truncateError) throw truncateError;

    // Insert new rankings with trend percentage
    const rankings = scores.map((score, index) => {
      const prevRank = prevRanks.get(score.brand_id);
      const trend_pct = prevRank 
        ? Number((((prevRank - (index + 1)) / prevRank) * 100).toFixed(2))
        : null;

      return {
        brand_id: score.brand_id,
        ranking_score: score.score,
        rank: index + 1,
        trend_pct,
        computed_at: new Date().toISOString()
      };
    });

    const { error: insertError } = await supabase
      .from('brand_rankings')
      .insert(rankings);

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        rankings_computed: rankings.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error computing rankings:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to compute rankings',
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