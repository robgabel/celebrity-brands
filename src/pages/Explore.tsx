import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Grid3X3, List, Search, X, Sparkles, Info } from 'lucide-react';
import { Button } from '../components/Button';
import { FavoriteButton } from '../components/FavoriteButton';
import { Pagination } from '../components/Pagination';
import { SemanticSearchBox } from '../components/SemanticSearchBox';
import { getCategoryColor, getCategoryIcon } from '../lib/categoryUtils';
import { isWithinDays } from '../lib/dateUtils';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { useBrandsData } from '../hooks/useBrandsData';
import { useState, useEffect } from 'react';

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const semanticQuery = searchParams.get('semantic');
  const isSemanticSearch = !!semanticQuery;
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const {
    brands,
    totalItems,
    loading,
    productCategories,
    founderTypes,
    isAdmin,
    isAuthenticated,
    favoriteIds,
    showFavoritesOnly,
    setShowFavoritesOnly,
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    categoryFilter,
    setCategoryFilter,
    founderFilter,
    setFounderFilter,
    typeFilter,
    setTypeFilter,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage,
    clearFilters,
    handleFavoriteChange,
    handleApprove,
    semanticResults,
    error = null
  } = useBrandsData();

  // Helper function to get match percentage color
  const getMatchColor = (similarity: number) => {
    const percentage = Math.round(similarity * 100);
    if (percentage >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (percentage >= 60) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (percentage >= 40) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  // Helper function to format match percentage
  const formatMatchPercentage = (similarity: number) => {
    return `${Math.round(similarity * 100)}%`;
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

  const getBrandUrl = (brand: any) => {
    // Create a URL-friendly slug from the brand name, but fallback to ID
    const slug = brand.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .trim();
    
    // Use the slug if it's meaningful, otherwise use the ID
    return `/brands/${slug || brand.id}`;
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
              {isSemanticSearch ? (
                <div className="bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-teal-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-teal-400" />
                    <h1 className="text-xl md:text-2xl font-bold text-gray-100">
                      AI Search Results
                    </h1>
                  </div>
                  <p className="text-gray-300 mb-1">
                    Searching for: <span className="font-medium text-teal-400">"{semanticQuery}"</span>
                  </p>
                  <p className="text-gray-400 text-sm">
                    Found {totalItems} brands ranked by AI relevance
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-gray-100">
                    Explore Celebrity & Creator Brands
                  </h1>
                  <p className="text-gray-400">Showing {totalItems} brands</p>
                </>
              )}
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

          <div>
            {isSemanticSearch ? (
              <div className="relative search-container">
                <SemanticSearchBox />
              </div>
            ) : (
              <div className="relative search-container">
                <SemanticSearchBox />
              </div>
            )}
          </div>

          {!isSemanticSearch && (
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
              disabled={!!semanticQuery}
            >
              Clear
            </Button>
            </div>
          )}
        </div>

        {loading ? (
        <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
          <div className="relative">
            {/* Outer ring */}
            <div className="w-16 h-16 border-4 border-gray-700/30 rounded-full"></div>
            {/* Spinning gradient ring */}
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-teal-500 border-r-teal-400 rounded-full animate-spin"></div>
            {/* Inner pulsing dot */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-300 font-medium mb-1">Loading brands...</p>
            <p className="text-gray-500 text-sm">Discovering amazing creator brands</p>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-xs text-gray-600 max-w-md">
              <p>Debug: Loading state is {loading ? 'TRUE' : 'FALSE'}</p>
              <p>Total brands: {totalItems}</p>
              <p>Brands array length: {brands.length}</p>
              <p>Error: {error || 'none'}</p>
              <p className="mt-2 text-gray-500">Check browser console for detailed logs</p>
            </div>
          )}
        </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="w-full bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800/50">
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[12%]">Brand</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[20%]">Creators</th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-[53%]">Description</th>
                      {isSemanticSearch && (
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-[7%]">
                          <div className="flex items-center justify-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Match
                          </div>
                        </th>
                      )}
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
                                  className="font-medium text-gray-100 hover:text-teal-400 break-words leading-tight"
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
                            <div className="text-sm text-gray-300 line-clamp-3 max-w-none">
                              {brand.description}
                            </div>
                          </td>
                          {isSemanticSearch && (
                            <td className="px-3 py-4">
                              <div className="flex justify-center">
                                <span 
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getMatchColor((brand as any).similarity || 0)}`}
                                  title={`${formatMatchPercentage((brand as any).similarity || 0)} semantic match`}
                                >
                                  {formatMatchPercentage((brand as any).similarity || 0)}
                                </span>
                              </div>
                            </td>
                          )}
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
                            <div className="relative flex-1">
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
                            {isSemanticSearch && (
                              <div className="relative">
                                <span 
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getMatchColor((brand as any).similarity || 0)}`}
                                  title={`${formatMatchPercentage((brand as any).similarity || 0)} semantic match`}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  {formatMatchPercentage((brand as any).similarity || 0)}
                                </span>
                              </div>
                            )}
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
            
            {!isSemanticSearch && (
              <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              isLoading={loading}
              />
            )}
          </>
        )}
        
        {/* Debug info - remove after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">🐛 Debug Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-300 mb-2">State</h4>
                <div className="space-y-1 text-gray-400">
                  <p>Loading: <span className={loading ? 'text-yellow-400' : 'text-green-400'}>{loading.toString()}</span></p>
                  <p>Error: <span className={error ? 'text-red-400' : 'text-green-400'}>{error || 'none'}</span></p>
                  <p>Brands count: <span className="text-blue-400">{brands.length}</span></p>
                  <p>Total items: <span className="text-blue-400">{totalItems}</span></p>
                  <p>Is semantic search: <span className="text-purple-400">{!!semanticQuery}</span></p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-300 mb-2">Filters</h4>
                <div className="space-y-1 text-gray-400">
                  <p>Search: <span className="text-blue-400">{searchInput || 'none'}</span></p>
                  <p>Category: <span className="text-blue-400">{categoryFilter}</span></p>
                  <p>Founder: <span className="text-blue-400">{founderFilter}</span></p>
                  <p>Type: <span className="text-blue-400">{typeFilter}</span></p>
                  <p>Sort: <span className="text-blue-400">{sortBy}</span></p>
                  <p>Favorites only: <span className="text-blue-400">{showFavoritesOnly.toString()}</span></p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-900 rounded text-xs text-gray-500">
              <p className="font-medium mb-1">💡 Debugging Tips:</p>
              <p>1. Open browser console (F12) for detailed logs</p>
              <p>2. Look for logs starting with 🔍, 🗄️, 📊, etc.</p>
              <p>3. Check network tab for failed API calls</p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}