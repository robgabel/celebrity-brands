import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from './Button';

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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!debouncedSearchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: debouncedSearchQuery })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to search: ${response.status}`);
      }

      const matches = await response.json();
      setResults(matches);
      setShowResults(true);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(`/brands/${result.id}`);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          placeholder="Describe what you're looking for..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setError(null);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full h-14 rounded-full bg-gray-900 border border-gray-700 px-6 pl-14 pr-32 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500"
        />
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-500" size={24} />
        
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setResults([]);
              setError(null);
            }}
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
        <div className="absolute top-16 left-0 right-0 bg-red-900/90 text-red-200 p-3 rounded-lg border border-red-800 z-50">
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-16 left-0 right-0 bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden z-50">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-gray-200 font-medium">{result.name}</h4>
                  <p className="text-sm text-gray-400">{result.creators}</p>
                </div>
                <span className="text-xs text-teal-400">
                  {Math.round(result.similarity * 100)}% match
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                {result.description}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}