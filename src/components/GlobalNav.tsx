import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { AdminRibbon } from './AdminRibbon';
import { useDebounce } from '../hooks/useDebounce';
import { ErrorMessage } from './ErrorMessage';

interface SearchResult {
  id: number;
  name: string;
  creators: string;
}

interface SearchSuggestion {
  type: 'brand' | 'category';
  text: string;
  id?: number;
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
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    
    try {
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name, creators')
        .eq('approval_status', 'approved')
        .or(`name.ilike.%${debouncedSearch}%,creators.ilike.%${debouncedSearch}%,description.ilike.%${debouncedSearch}%`)
        .limit(5);

      if (brandsError) {
        throw brandsError;
      }

      const { data: categories, error: categoriesError } = await supabase
        .from('brands')
        .select('product_category')
        .eq('approval_status', 'approved')
        .ilike('product_category', `%${debouncedSearch}%`)
        .limit(3);

      if (categoriesError) {
        throw categoriesError;
      }

      const uniqueCategories = Array.from(
        new Set(categories?.map(item => item.product_category) || [])
      );

      const suggestions: SearchSuggestion[] = [
        ...(brands?.map((brand: SearchResult) => ({
          type: 'brand' as const,
          text: brand.name,
          id: brand.id,
          subtext: brand.creators
        })) || []),
        ...uniqueCategories.map(category => ({
          type: 'category' as const,
          text: category
        }))
      ];

      setSuggestions(suggestions);
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
      setError(err.message);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    
    if (suggestion.type === 'brand' && suggestion.id) {
      navigate(`/brands/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      navigate(`/explore?category=${encodeURIComponent(suggestion.text)}`);
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
    <header className="bg-gradient-to-b from-gray-900 via-gray-800/90 to-gray-900 backdrop-blur-sm text-gray-200 py-4 px-4 md:px-6 border-b border-gray-800/50 relative z-[100]">
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
            <Link 
              to="/suggest-brand" 
              className="text-gray-300 hover:text-gray-100 transition-colors"
            >
              Suggest a Brand
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
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