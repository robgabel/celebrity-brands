import { useState } from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import type { RankingResponse } from '../services/domainRankingService';

interface DomainRankingProps {
  data: RankingResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function DomainRanking({ data, isLoading, error }: DomainRankingProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 text-red-200 p-4 rounded-lg border border-red-700/50">
        {error}
      </div>
    );
  }

  if (!data || !data.domainFound) {
    return null;
  }

  const rankTrend = data.historicalRanks.length >= 2 ? 
    (data.historicalRanks[0].rank > data.historicalRanks[data.historicalRanks.length - 1].rank ? 'up' : 'down') : 
    'neutral';

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 relative">
          <h3 className="text-lg font-semibold text-gray-200">Domain Ranking</h3>
          <button
            className="text-gray-400 hover:text-gray-300"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info className="w-4 h-4" />
          </button>
          {showTooltip && (
            <div className="absolute mt-8 p-3 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 text-sm text-gray-200 max-w-xs z-10">
              Rankings from the Tranco list, which aggregates multiple domain ranking services.
              Lower numbers indicate higher traffic and popularity.
            </div>
          )}
        </div>
        {rankTrend !== 'neutral' && (
          <div className="flex items-center gap-2">
            {rankTrend === 'up' ? (
              <div className="flex items-center text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">Improving</span>
              </div>
            ) : (
              <div className="flex items-center text-red-400">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span className="text-sm">Declining</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-sm text-gray-400">Current Rank</div>
          <div className="text-lg font-semibold text-gray-200">
            #{data.currentRank?.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Latest position in rankings
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-sm text-gray-400">Best Rank</div>
          <div className="text-lg font-semibold text-gray-200">
            #{data.bestRank?.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Highest historical position
          </div>
        </div>
      </div>
    </div>
  );
}