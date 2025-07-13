import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BrandCard } from '../components/BrandCard';
import { getCategoryIcon } from '../lib/categoryUtils';
import { GlobalNav } from '../components/GlobalNav';
import { Footer } from '../components/Footer';
import { SemanticSearchBox } from '../components/SemanticSearchBox';
import { ErrorMessage } from '../components/ErrorMessage';
import { BrandStoryDebugger } from '../components/BrandStoryDebugger';
import type { Brand } from '../types/brand';

export function HomePage() {
  const navigate = useNavigate();
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [recentBrands, setRecentBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [totalBrands, setTotalBrands] = useState<number>(0);

  useEffect(() => {
    checkAuth();
    const fetchHomeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { count: brandsCount } = await supabase
          .from('brands')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved');
        
        setTotalBrands(brandsCount || 0);
        
        const { data: featuredData, error: featuredError } = await supabase
          .from('brands')
          .select('*')
          .eq('approval_status', 'approved')
          .is('year_discontinued', null)
          .eq('brand_collab', false)
          .order('id', { ascending: false })
          .limit(20);
          
        if (featuredError) throw featuredError;
        
        // Randomly select 4 brands from the results
        if (featuredData && featuredData.length > 0) {
          const shuffled = [...featuredData].sort(() => Math.random() - 0.5);
          setFeaturedBrands(shuffled.slice(0, 4));
        } else {
          setFeaturedBrands([]);
        }
        
        const { data: recentData, error: recentError } = await supabase
          .from('brands')
          .select('*')
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8);
          
        if (recentError) throw recentError;
        setRecentBrands(recentData || []);
        
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
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ErrorMessage 
            message={error} 
            className="max-w-lg"
          />
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 rounded-md transition-colors text-white"
          >
            Retry
          </button>
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
      <Helmet>
        <title>Celebrity Brands Database | Track Creator & Influencer Brands</title>
        <meta name="description" content="Discover and track celebrity, creator, and influencer-owned brands. Get detailed analytics, brand stories, and market insights for the creator economy." />
        <link rel="canonical" href="https://celebritybrands.com" />
      </Helmet>
      <GlobalNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <section className="py-12 md:py-20 px-4 mb-12 bg-gray-800/50 backdrop-blur-sm rounded-xl text-center border border-gray-700/50">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-100 mb-4 sm:mb-6 max-w-4xl mx-auto leading-tight">
            Discover and Invest in 397<br />
            Celebrity or Creator Brands
          </h1>
          <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
            * investing isn't possible yet, but did it get your attention? :)
          </p>
          
          <SemanticSearchBox />
          
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6">
            <Link 
              to="/explore" 
              className="text-teal-400 hover:text-teal-300 transition-colors text-sm md:text-base font-medium"
            >
              Browse All Brands
            </Link>
          </div>
        </section>
        
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
      
      {/* Debug component - remove after testing */}
      <BrandStoryDebugger />
      
      <Footer />
    </div>
  ); 
}