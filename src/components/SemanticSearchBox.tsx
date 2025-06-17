import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

interface SearchResult {
  id: number;
  name: string;
  creators: string;
  product_category: string;
  description: string;
  similarity: number;
}

export function SemanticSearchBox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
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
    }
  }, [debouncedSearchQuery]);

  const performSearch = async (shouldNavigate = true) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setShowResults(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: searchQuery.trim() })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to search: ${response.status}`);
      }

      const data = await response.json();
      const matches = data.results || [];
      setResults(matches);

      if (shouldNavigate) {
        setSearchQuery('');
        setShowResults(false);
        navigate(`/explore?semantic=${encodeURIComponent(searchQuery.trim())}`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
      setResults([]);
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
    navigate(`/brands/${result.id}`);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
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
              <span className="text-sm text-gray-400">
                Found {results.length} matching brands
              </span>
              <button
                onClick={handleSubmit}
                className="text-sm text-teal-400 hover:text-teal-300 font-medium"
              >
                View all results →
              </button>
            </div>
          </div>
          {results.slice(0, 5).map((result) => (
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
                <span className="text-xs text-teal-400 ml-2">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                {result.description}
              </p>
            </button>
          ))}
          {results.length > 5 && (
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
          <p className="text-gray-400 text-center">
            No brands found matching "{searchQuery}". Try different keywords or browse all brands.
          </p>
        </div>
      )}
    </div>
  );
}