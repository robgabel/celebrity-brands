import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

export function SemanticSearchBox() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Navigate to explore page with semantic search query
      navigate(`/explore?semantic=${encodeURIComponent(searchQuery.trim())}`);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setError(null);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          placeholder="Describe what you're looking for... (e.g., 'sustainable fashion brands by actors')"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setError(null);
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
    </div>
  );
}