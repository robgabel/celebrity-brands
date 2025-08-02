import { useEffect, useState, useCallback } from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { retrySupabaseOperation } from '../lib/supabase';
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
  
  // Use ref to prevent multiple simultaneous fetches
  const isFetchingRef = useRef(false);

  const fetchHomeData = useCallback(async () => {
    console.log('🏠 HOME: fetchHomeData called, isFetching:', isFetchingRef.current);
    if (isFetchingRef.current) {
      console.log('🏠 HOME: Already fetching, skipping fetch');
      return;
    }
    
    try {
      console.log('🏠 HOME: Starting data fetch...');
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Use retry logic for all database operations
      await retrySupabaseOperation(async () => {
        console.log('🏠 HOME: Inside retry operation, fetching total brands count...');
        const { count: brandsCount } = await supabase
          .from('brands')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved');
        
        console.log('🏠 HOME: Total brands count received:', brandsCount);
        setTotalBrands(brandsCount || 0);
        
        console.log('🏠 HOME: Fetching featured brands...');
        const { data: featuredData, error: featuredError } = await supabase
          .from('brands')
          .select('id, name, creators, product_category, description, year_founded, type_of_influencer, brand_collab, logo_url, created_at')
          .eq('approval_status', 'approved')
          .is('year_discontinued', null)
          .eq('brand_collab', false)
          .order('id', { ascending: false })
          .limit(20);
          
        if (featuredError) throw featuredError;
        
        console.log('🏠 HOME: Featured brands received:', featuredData?.length || 0);
        
        // Randomly select 4 brands from the results
        if (featuredData && featuredData.length > 0) {
          const shuffled = [...featuredData].sort(() => Math.random() - 0.5);
          setFeaturedBrands(shuffled.slice(0, 4));
          console.log('🏠 HOME: Featured brands set:', shuffled.slice(0, 4).map(b => b.name));
        } else {
          console.log('🏠 HOME: No featured brands found');
          setFeaturedBrands([]);
        }
        
        // Temporarily comment out recent brands and categories to isolate the issue
        console.log('🏠 HOME: Skipping recent brands and categories for debugging');
        setRecentBrands([]);
        setCategories([]);
        
        // const { data: recentData, error: recentError } = await supabase
        //   .from('brands')
        //   .select('id, name, creators, product_category, description, year_founded, type_of_influencer, brand_collab, logo_url, created_at')
        //   .eq('approval_status', 'approved')
        //   .order('created_at', { ascending: false })
        //   .limit(8);
        //   
        // if (recentError) throw recentError;
        // setRecentBrands(recentData || []);
        // 
        // const { data: categoryData, error: categoryError } = await supabase
        //   .from('brands')
        //   .select('product_category')
        //   .eq('approval_status', 'approved');
        //   
        // if (categoryError) throw categoryError;
        // 
        // if (categoryData) {
        //   const uniqueCategories = Array.from(
        //     new Set(categoryData.map(item => item.product_category))
        //   ).filter(Boolean) as string[];
        //   
        //   setCategories(uniqueCategories.sort());
        // }
      }, 3, 2000);
      
      console.log('🏠 HOME: All data fetching completed successfully');
      
    } catch (err: any) {
      console.error('🏠 HOME: Error fetching home data:', err);
      setError(err.message || 'Failed to connect to the database. Please check your internet connection and try again.');
    } finally {
      console.log('🏠 HOME: Setting loading to false');
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    console.log('🏠 HOME: checkAuth called');
    try {
      await retrySupabaseOperation(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🏠 HOME: Auth check result:', !!user);
        setIsAuthenticated(!!user);
      }, 2, 1000);
    } catch (err) {
      console.error('🏠 HOME: Auth check failed:', err);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    console.log('🏠 HOME: useEffect triggered');
    checkAuth();
    fetchHomeData();
  }, [checkAuth, fetchHomeData]);
  
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
            Discover and Invest in {totalBrands}<br />
            Celebrity & Creator Brands
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
              Or, Explore All Brands
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