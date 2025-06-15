import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Grid3X3, List, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { FavoriteButton } from '../components/FavoriteButton';
import { Pagination } from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { getCategoryColor, getCategoryIcon } from '../lib/categoryUtils';
import { isWithinDays } from '../lib/dateUtils';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import type { Brand } from '../types/brand';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const semanticQuery = searchParams.get('semantic');
  const searchQuery = searchParams.get('search');
  const [semanticResults, setSemanticResults] = useState<Brand[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchQuery || '');
  const [debouncedSearchQuery] = useDebounce(searchInput, 300);
  const [sortBy, setSortBy] = useState<string>('az');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'All Categories');
  const [founderFilter, setFounderFilter] = useState(searchParams.get('founderType') || 'All Founder Types');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [founderTypes, setFounderTypes] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const { 
    currentPage, 
    itemsPerPage, 
    setCurrentPage, 
    setItemsPerPage,
    resetPagination 
  } = usePagination(25);

  const clearFilters = () => {
    setSearchInput('');
    setSortBy('az');
    setCategoryFilter('All Categories');
    setFounderFilter('All Founder Types');
    setTypeFilter('All Types');
    resetPagination();
  };

  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 768;
      setViewMode(isMobileView ? 'grid' : 'list');
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (semanticQuery) {
      handleSemanticSearch();
    } else {
      checkAuth();
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchBrands(), fetchFounderTypes(), fetchProductCategories()]);
  }, [currentPage, itemsPerPage, showFavoritesOnly, debouncedSearchQuery, categoryFilter, founderFilter, typeFilter, sortBy, isAdmin]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const handleSemanticSearch = async () => {
    if (semanticQuery) {
      try {
        setError(null);
        setLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/semantic-search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: semanticQuery })
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to search: ${response.status}`);
        }

        const matches = await response.json();
        setBrands(matches.results || matches);
        setTotalItems((matches.results || matches).length);
        checkAuth(); // Still need to check auth for other features
        return;
      } catch (err: any) {
        console.error('Semantic search error:', err);
        setError(err.message);
        setLoading(false);
        return;
      }
    }
  };

  const checkAuth = async () => {
    setLoading(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('auth_id', user.id)
          .single();
        
        setIsAdmin(!!profile?.is_admin);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  const fetchProductCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('product_category')
        .eq('approval_status', 'approved')
        .not('product_category', 'is', null)
        .order('product_category');

      if (error) throw error;

      const uniqueCategories = Array.from(new Set(data.map(item => item.product_category)))
        .filter(Boolean)
        .sort();

      setProductCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching product categories:', err);
    }
  };

  const fetchFounderTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('type_of_influencer')
        .eq('approval_status', 'approved')
        .not('type_of_influencer', 'is', null)
        .order('type_of_influencer');

      if (error) throw error;

      const uniqueTypes = Array.from(new Set(data.map(item => item.type_of_influencer)))
        .filter(Boolean)
        .sort();

      setFounderTypes(uniqueTypes);
    } catch (err) {
      console.error('Error fetching founder types:', err);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorite_brands')
        .select('brand_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setFavoriteIds(data.map(fav => fav.brand_id));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  const handleApprove = async (brandId: number) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ approval_status: 'approved' })
        .eq('id', brandId);

      if (error) throw error;

      await fetchBrands();
    } catch (err) {
      console.error('Error approving brand:', err);
    }
  };

  async function fetchBrands() {
    try {
      setLoading(true);
      let query = supabase
        .from('brands')
        .select('*', { count: 'exact' });
      
      // Non-admin users can only see approved brands
      if (!isAdmin) {
        query = query.eq('approval_status', 'approved');
      }

      if (debouncedSearchQuery) {
        // Use more efficient pattern matching
        const searchPattern = `%${debouncedSearchQuery.toLowerCase()}%`;
        query = query.or(
          `lower(name).like.${searchPattern},` +
          `lower(creators).like.${searchPattern}`
        );
      }

      if (categoryFilter !== 'All Categories') {
        query = query.eq('product_category', categoryFilter);
      }

      if (founderFilter !== 'All Founder Types') {
        query = query.eq('type_of_influencer', founderFilter);
      }

      if (typeFilter !== 'All Types') {
        query = query.eq('brand_collab', typeFilter === 'Collab');
      }

      if (showFavoritesOnly && favoriteIds.length > 0) {
        query = query.in('id', favoriteIds);
      }

      const sortOptions = [
        { value: 'az', field: 'name', ascending: true },
        { value: 'newest', field: 'year_founded', ascending: false },
        { value: 'oldest', field: 'year_founded', ascending: true }
      ];

      const selectedSort = sortOptions.find(option => option.value === sortBy) || sortOptions[0];
      query = query.order(selectedSort.field, { ascending: selectedSort.ascending });

      // Execute query with pagination
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;
      
      const { data, error, count } = await query
        .range(start, end)
        .throwOnError();

      if (error) {
        throw error;
      }

      setBrands(data || []);
      setTotalItems(count || 0);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFavoriteChange = useCallback((brandId: number, isFavorited: boolean) => {
    setFavoriteIds(prev => 
      isFavorited 
        ? [...prev, brandId]
        : prev.filter(id => id !== brandId)
    );
  }, []);

  const getBrandUrl = (brand: Brand) => {
    return `/brands/${brand.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav 
        showFavoritesToggle
        onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
        showFavoritesOnly={showFavoritesOnly}
        hasFavorites={favoriteIds.length > 0}
      />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-gray-100">
                Explore Celebrity & Creator Brands
              </h1>
              <p className="text-gray-400">Showing {totalItems} brands</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border border-gray-700 rounded-lg bg-gray-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-700 text-gray-200' : 'text-gray-400 hover:text-gray-200'}`}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-700 text-gray-200' : 'text-gray-400 hover:text-gray-200'}`}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200"
              style={{ minWidth: '200px', width: 'auto' }}
            >
              <option value="az">Name (A to Z)</option>
              <option value="newest">Year Founded (Newest)</option>
              <option value="oldest">Year Founded (Oldest)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200"
              style={{ minWidth: '200px', width: 'auto' }}
            >
              <option>All Categories</option>
              {productCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={founderFilter}
              onChange={(e) => setFounderFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200"
              style={{ minWidth: '240px', width: 'auto' }}
            >
              <option>All Founder Types</option>
              {founderTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-200"
              style={{ minWidth: '120px', width: 'auto' }}
            >
              <option>All Types</option>
              <option>Own</option>
              <option>Collab</option>
            </select>

            <Button
              variant="secondary"
              onClick={clearFilters}
              className="flex items-center gap-1"
            >
              Clear
            </Button>
          </div>
        </div>

        {semanticQuery && (
          <div className="mb-6 p-4 bg-teal-900/20 border border-teal-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-5 h-5 text-teal-400" />
              <span className="text-teal-400 font-medium">Semantic Search Results</span>
            </div>
            <p className="text-gray-300">
              Showing brands matching: <span className="font-medium text-gray-100">"{semanticQuery}"</span>
            </p>
            <button
              onClick={() => {
                navigate('/explore');
                window.location.reload();
              }}
              className="mt-2 text-sm text-teal-400 hover:text-teal-300"
            >
              ← Back to all brands
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading brands...</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="w-full bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800/50">
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[15%]">Brand</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[20%]">Creators</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[15%]">Category</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[42%]">Description</th>
                      <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-[8%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {brands.map((brand) => {
                      const categoryColors = getCategoryColor(brand.product_category);
                      const isNew = isWithinDays(brand.created_at, 7);
                      const Icon = getCategoryIcon(brand.product_category);
                      return (
                        <tr key={brand.id} className={`group hover:bg-gray-800/50 transition-colors duration-150 ${
                          isNew ? 'bg-yellow-900/10' : 'bg-transparent'
                        }`}>
                          <td className="px-3 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg ${categoryColors.bg} ${categoryColors.text}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="relative">
                                <Link 
                                  to={getBrandUrl(brand)}
                                  className="font-medium text-gray-100 hover:text-teal-400 truncate max-w-[120px]"
                                >
                                  {brand.name}
                                </Link>
                                {isNew && (
                                  <span className="absolute -top-3 -right-8 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs font-medium rounded border border-yellow-500/20">
                                    NEW
                                  </span>
                                )}
                                {isAdmin && brand.approval_status === 'pending' && (
                                  <span className="absolute -top-3 -right-16 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs font-medium rounded border border-yellow-500/20">
                                    PENDING
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-300 truncate max-w-[120px]">
                              {brand.creators}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(brand.product_category).bg} ${getCategoryColor(brand.product_category).text}`}>
                              {brand.product_category}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-sm text-gray-300 line-clamp-2">
                              {brand.description}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <FavoriteButton
                                brandId={brand.id}
                                initialFavorited={favoriteIds.includes(brand.id)}
                                onFavoriteChange={(isFavorited) => handleFavoriteChange(brand.id, isFavorited)}
                              />
                              {isAdmin && brand.approval_status === 'pending' && (
                                <Button
                                  onClick={() => handleApprove(brand.id)}
                                  className="text-xs px-2 py-1"
                                >
                                  Approve
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {brands.map((brand) => {
                  const categoryColors = getCategoryColor(brand.product_category);
                  const isNew = isWithinDays(brand.created_at, 7);
                  const Icon = getCategoryIcon(brand.product_category);
                  return (
                    <div
                      key={brand.id} 
                      className={`group bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-700/50 cursor-pointer ${
                        isNew ? 'bg-yellow-900/10' : ''
                      }`}
                      onClick={(e) => {
                        // Don't navigate if clicking favorite button or approve button
                        if (!(e.target as HTMLElement).closest('button')) {
                          navigate(getBrandUrl(brand));
                        }
                      }}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${categoryColors.bg} ${categoryColors.text}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="relative">
                              <span className="text-lg font-medium text-gray-100 group-hover:text-teal-400 truncate">
                                {brand.name}
                              </span>
                              {isNew && (
                                <span className="absolute -top-3 -right-8 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs font-medium rounded border border-yellow-500/20">
                                  NEW
                                </span>
                              )}
                              {isAdmin && brand.approval_status === 'pending' && (
                                <span className="absolute -top-3 -right-16 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs font-medium rounded border border-yellow-500/20">
                                  PENDING
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FavoriteButton
                              brandId={brand.id}
                              initialFavorited={favoriteIds.includes(brand.id)}
                              onFavoriteChange={(isFavorited) => handleFavoriteChange(brand.id, isFavorited)}
                            />
                            {isAdmin && brand.approval_status === 'pending' && (
                              <Button
                                onClick={() => handleApprove(brand.id)}
                                className="text-xs px-2 py-1"
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 mb-3 truncate">{brand.creators}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryColors.bg} ${categoryColors.text}`}>
                            {brand.product_category}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            brand.brand_collab 
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : 'bg-green-500/10 text-green-300 border border-green-500/20'
                          }`}>
                            {brand.brand_collab ? 'Collab' : 'Own'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 line-clamp-2">{brand.description}</p>
                        <p className="text-sm text-gray-400 mt-2">Founded: {brand.year_founded}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              isLoading={loading}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}