import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BrandCard } from '../components/BrandCard';
import { getCategoryIcon } from '../lib/categoryUtils';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { useDebounce } from '../hooks/useDebounce';
import type { Brand } from '../types/brand';

interface SearchSuggestion {
  type: 'brand' | 'category';
  text: string;
  subtext?: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [recentBrands, setRecentBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('form')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const debouncedSearch = useDebounce(searchQuery, 300);
  
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

  useEffect(() => {
    checkAuth();
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch featured brands (currently just getting popular ones)
        const { data: featuredData, error: featuredError } = await supabase
          .from('brands')
          .select('*')
          .eq('approval_status', 'approved')
          .limit(4);
          
        if (featuredError) throw featuredError;
        setFeaturedBrands(featuredData || []);
        
        // Fetch recently added brands
        const { data: recentData, error: recentError } = await supabase
          .from('brands')
          .select('*')
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8);
          
        if (recentError) throw recentError;
        setRecentBrands(recentData || []);
        
        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
          .from('brands')
          .select('product_category')
          .eq('approval_status', 'approved');
          
        if (categoryError) throw categoryError;
        
        if (categoryData) {
          const uniqueCategories = Array.from(
            new Set(categoryData.map(item => item.product_category))
          ).filter(Boolean) as string[];
          
          setCategories(uniqueCategories.sort());
        }
      } catch (err: any) {
        console.error('Error fetching home data:', err);
        setError(err.message || 'Failed to load content. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHomeData();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
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
    }
  };
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="bg-red-900/50 border border-red-800 text-red-200 p-6 rounded-lg max-w-lg">
            <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="py-12 md:py-20 px-4 mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl text-center border border-gray-700/50">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-100 mb-4 sm:mb-6 max-w-4xl mx-auto leading-tight">
            Discover and Follow<br />
            Celebrity-Owned Brands
          </h1>
          <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            Your comprehensive platform for discovering, tracking, and engaging with brands created by celebrities and influencers.
          </p>
          
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search brands, creators, or categories..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full h-14 rounded-full bg-gray-900 border border-gray-700 px-6 pl-14 pr-32 text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <Search 
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" 
                size={24} 
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-32 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button 
                type="submit" 
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-full transition-colors"
              >
                Search
              </button>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-16 left-0 w-full bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden z-50">
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
          </form>
          
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6">
            <Link 
              to="/explore" 
              className="text-teal-400 hover:text-teal-300 transition-colors text-sm md:text-base font-medium"
            >
              Browse All Brands
            </Link>
          </div>
        </section>
        
        {/* Featured Brands */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-100">Featured Brands</h2>
            <Link 
              to="/explore" 
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              View All
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBrands.map(brand => (
              <BrandCard 
                key={brand.id} 
                brand={brand}
                isFavorited={false}
                onFavoriteToggle={() => {}}
              />
            ))}
          </div>
        </section>
        
        {/* Categories */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-100">Browse by Category</h2>
            <Link 
              to="/explore" 
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              All Categories
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.slice(0, 8).map(category => {
              const Icon = getCategoryIcon(category);
              return (
                <Link
                  key={category}
                  to={`/explore?category=${encodeURIComponent(category)}`}
                  className="bg-gray-800/50 hover:bg-gray-700/50 transition-colors p-4 rounded-lg border border-gray-700/50 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center text-teal-400">
                    {Icon && <Icon className="w-6 h-6" />}
                  </div>
                  <span className="text-gray-200 font-medium">{category}</span>
                </Link>
              );
            })}
          </div>
        </section>
        
        {/* Recently Added */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Calendar className="text-teal-400" size={24} />
              Recently Added Brands
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentBrands.slice(0, 4).map(brand => (
              <BrandCard 
                key={brand.id} 
                brand={brand}
                isFavorited={false}
                onFavoriteToggle={() => {}}
              />
            ))}
          </div>
        </section>
        
        {/* Call to Action - Only shown to non-authenticated users */}
        {!isAuthenticated && (
          <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center mb-8 border border-gray-700/50">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-100 mb-4">
              Ready to Track Your Favorite Brands?
            </h2>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Create an account to favorite brands, set goals, and join the community of brand enthusiasts.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium"
              >
                Create Account
              </Link>
              <Link 
                to="/explore" 
                className="px-6 py-3 border border-teal-600 text-teal-400 hover:bg-teal-600 hover:text-white rounded-lg transition-colors font-medium"
              >
                Explore Brands
              </Link>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </div>
  ); 
}