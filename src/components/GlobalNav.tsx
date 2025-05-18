import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { AdminRibbon } from './AdminRibbon';
import { useDebounce } from '../hooks/useDebounce';

interface SearchSuggestion {
  type: 'brand' | 'category';
  text: string;
  subtext?: string;
}

interface GlobalNavProps {
  showFavoritesToggle?: boolean;
  onFavoritesToggle?: () => void;
  showFavoritesOnly?: boolean;
  hasFavorites?: boolean;
}

export function GlobalNav({ 
  showFavoritesToggle = false,
  onFavoritesToggle,
  showFavoritesOnly = false,
  hasFavorites = false
}: GlobalNavProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      // Search brands
      const { data: brands } = await supabase
        .from('brands')
        .select('name, creators')
        .eq('approval_status', 'approved')
        .or(`name.ilike.%${debouncedSearch}%,creators.ilike.%${debouncedSearch}%`)
        .limit(5);

      // Search categories
      const { data: categories } = await supabase
        .from('brands')
        .select('product_category')
        .eq('approval_status', 'approved')
        .ilike('product_category', `%${debouncedSearch}%`)
        .limit(3);

      const uniqueCategories = Array.from(
        new Set(categories?.map(item => item.product_category) || [])
      );

      const suggestions: SearchSuggestion[] = [
        ...(brands?.map(brand => ({
          type: 'brand' as const,
          text: brand.name,
          subtext: brand.creators
        })) || []),
        ...uniqueCategories.map(category => ({
          type: 'category' as const,
          text: category
        }))
      ];

      setSuggestions(suggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToSearch(searchQuery);
  };

  const navigateToSearch = (query: string, type?: 'category') => {
    if (query.trim()) {
      const searchParams = type === 'category' 
        ? `category=${encodeURIComponent(query)}`
        : `search=${encodeURIComponent(query)}`;
      navigate(`/explore?${searchParams}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  return (
    <header className="bg-gradient-to-b from-gray-900 via-gray-800/90 to-gray-900 backdrop-blur-sm text-gray-200 py-4 px-4 md:px-6 border-b border-gray-800/50 relative z-[200]">
      {isAdmin && <AdminRibbon />}
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
            <span className="flex items-baseline gap-2">
              Celebrity Brands
              <span className="text-sm font-normal text-gray-500">by Rob Gabel</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link 
              to="/explore" 
              className="text-gray-300 hover:text-gray-100 transition-colors"
            >
              Explore
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative search-container">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-56 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200 placeholder-gray-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden z-50">
                {isLoadingSuggestions ? (
                  <div className="p-4 text-center text-gray-400">
                    Loading suggestions...
                  </div>
                ) : (
                  <ul>
                    {suggestions.map((suggestion, index) => (
                      <li key={`${suggestion.type}-${index}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery(suggestion.text);
                            setShowSuggestions(false);
                            navigateToSearch(suggestion.text, suggestion.type === 'category' ? 'category' : undefined);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-700/50 flex items-start gap-3"
                        >
                          <Search className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-gray-200">{suggestion.text}</div>
                            {suggestion.subtext && (
                              <div className="text-sm text-gray-400">
                                {suggestion.subtext}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="secondary">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}