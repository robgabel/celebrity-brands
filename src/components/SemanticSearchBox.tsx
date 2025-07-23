import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Sparkles, Hash } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';
import { supabase } from '../lib/supabase';

interface SearchResult {
  id: number;
  name: string;
  creators: string;
  product_category: string;
  description: string;
  similarity?: number;
}

export function SemanticSearchBox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isKeywordFallback, setIsKeywordFallback] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.semantic-search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery.trim() && debouncedSearchQuery.length > 3) {
      performSearch(false);
    } else {
      setResults([]);
      setShowResults(false);
      setIsKeywordFallback(false);
    }
  }, [debouncedSearchQuery]);

  const performKeywordSearch = async (query: string): Promise<SearchResult[]> => {
    try {
      const searchPattern = `%${query.toLowerCase()}%`;
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, creators, product_category, description')
        .eq('approval_status', 'approved')
        .or(`name.ilike.${searchPattern},creators.ilike.${searchPattern}`)
        .limit(8);

      if (brandsError) {
        throw brandsError;
      }

      return brands || [];
    } catch (err: any) {
      console.error('Keyword search error:', err);
      throw new Error('Failed to perform keyword search');
    }
  };

  const performSearch = async (shouldNavigate = true) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      setIsKeywordFallback(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setShowResults(true);
    setIsKeywordFallback(false);

    try {
      // Step 1: Try semantic search first
      let response;
      try {
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: searchQuery.trim() }),
            signal: AbortSignal.timeout(30000) // 30 second timeout
          }
        );
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        if (fetchError.message === 'Failed to fetch') {
          throw new Error('Unable to connect to search service. Please check your internet connection and try again.');
        }
        throw new Error(`Network error: ${fetchError.message}`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to search: ${response.status}`);
      }

      const data = await response.json();
      const semanticMatches = data.results || [];
      
      // Step 2: If semantic search found results, use them
      if (semanticMatches.length > 0) {
        setResults(semanticMatches);
        setIsKeywordFallback(false);

        if (shouldNavigate) {
          setSearchQuery('');
          setShowResults(false);
          navigate(`/explore?semantic=${encodeURIComponent(searchQuery.trim())}`);
        }
        return;
      }

      // Step 3: If no semantic results, try keyword search as fallback
      console.log('No semantic results found, trying keyword search fallback...');
      const keywordMatches = await performKeywordSearch(searchQuery.trim());
      
      if (keywordMatches.length > 0) {
        setResults(keywordMatches);
        setIsKeywordFallback(true);
        
        if (shouldNavigate) {
          // For keyword results, don't auto-navigate, let user select from dropdown
          return;
        }
      } else {
        // No results from either search method
        setResults([]);
        setIsKeywordFallback(false);
      }

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
      setResults([]);
      setIsKeywordFallback(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch(true);
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowResults(false);
    setIsKeywordFallback(false);
    navigate(`/brands/${result.id}`);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
    setIsKeywordFallback(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto semantic-search-container">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          placeholder="Describe what you're looking for... (e.g., 'sustainable fashion brands by actors')"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setError(null);
          }}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          className="w-full h-14 rounded-full bg-gray-900 border border-gray-700 px-6 pl-14 pr-32 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500"
        />
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500" size={24} />
        
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-24 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <Button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Search'
          )}
        </Button>
      </form>

      {error && (
        <ErrorMessage 
          message={error} 
          className="absolute top-16 left-0 right-0 z-50" 
        />
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-16 left-0 right-0 bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700 bg-gray-750">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isKeywordFallback ? (
                  <>
                    <Hash className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400">
                      Brand name matches for "{searchQuery}"
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span className="text-sm text-gray-400">
                      Found {results.length} matching brands
                    </span>
                  </>
                )}
              </div>
              {!isKeywordFallback && (
                <button
                  onClick={handleSubmit}
                  className="text-sm text-teal-400 hover:text-teal-300 font-medium"
                >
                  View all results →
                </button>
              )}
            </div>
          </div>
          {results.slice(0, 8).map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-gray-200 font-medium">{result.name}</h4>
                  <p className="text-sm text-gray-400">{result.creators}</p>
                </div>
                {!isKeywordFallback && result.similarity && (
                  <span className="text-xs text-teal-400 ml-2">
                    {Math.round(result.similarity * 100)}% match
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                {result.description}
              </p>
            </button>
          ))}
          {results.length > 8 && !isKeywordFallback && (
            <div className="p-3 bg-gray-750 border-t border-gray-700">
              <button
                onClick={handleSubmit}
                className="w-full text-center text-sm text-teal-400 hover:text-teal-300 font-medium"
              >
                View all {results.length} results →
              </button>
            </div>
          )}
        </div>
      )}

      {showResults && results.length === 0 && !isSearching && searchQuery.trim() && (
        <div className="absolute top-16 left-0 right-0 bg-gray-800 rounded-lg border border-gray-700 shadow-xl p-4 z-50">
          <p className="text-gray-400 text-center mb-4">
            No brands found matching "{searchQuery}", try a different search or
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setShowResults(false);
                navigate('/explore');
              }}
              className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
            >
              Browse All Brands
            </button>
          </div>
        </div>
      )}
    </div>
  );
}