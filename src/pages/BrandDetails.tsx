import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, Calendar, Building2, Package, AlertCircle, Newspaper, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FavoriteButton } from '../components/FavoriteButton';
import { getCategoryColor } from '../lib/categoryUtils';
import { getBrandNews } from '../lib/newsApi';
import { getWikipediaPageViews, TrendResponse } from '../services/wikipediaTrendsService';
import { getDomainRanking, RankingResponse } from '../services/domainRankingService';
import { TrendChart } from '../components/TrendChart';
import { DomainRanking } from '../components/DomainRanking';
import { GlobalNav } from '../components/GlobalNav';
import { Button } from '../components/Button';

interface NewsArticle {
  title: string;
  url: string;
  description: string;
  image_url: string | null;
  published_at: string;
  source: string;
}

interface Brand {
  id: number;
  name: string;
  creators: string;
  product_category: string;
  description: string;
  year_founded: number;
  year_discontinued: number | null;
  type_of_influencer: string;
  brand_collab: boolean;
  logo_url: string | null;
  homepage_url: string | null;
  social_links: Record<string, string> | null;
  approval_status: string;
  brand_story: {
    summary: string;
    full_story: string[];
    metrics: Record<string, string>;
    key_events: string[];
  } | null;
  last_story_update: string | null;
}

export function BrandDetails() {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [rankingData, setRankingData] = useState<RankingResponse | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const generateBrandStory = async () => {
    if (!brand) return;
    
    setIsGeneratingStory(true);
    setStoryError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-brand-story`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ brandId: brand.id })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate brand story');
      }

      // Refresh brand data to get the new story
      await fetchBrandDetails();
    } catch (err: any) {
      console.error('Error generating brand story:', err);
      setStoryError(err.message);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('auth_id', user.id)
            .single();
          
          setIsAdmin(!!profile?.is_admin);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
    fetchBrandDetails();
  }, [brandSlug]);

  useEffect(() => {
    if (brand) {
      fetchBrandNews(brand.name);
      fetchBrandTrends(brand.name);
      fetchDomainRanking(brand.name, brand.homepage_url);
    }
  }, [brand]);

  const fetchBrandTrends = async (brandName: string) => {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const data = await getWikipediaPageViews(brandName);
      setTrendData(data);
    } catch (err: any) {
      console.error('Error fetching trends:', err);
      setTrendError(err.message);
    } finally {
      setTrendLoading(false);
    }
  };

  const fetchDomainRanking = async (brandName: string, homepageUrl: string | null) => {
    setRankingLoading(true);
    setRankingError(null);
    try {
      // Try homepage URL first, fallback to brand name
      const domain = homepageUrl ? 
        new URL(homepageUrl).hostname :
        `${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
        
      const data = await getDomainRanking(domain);
      setRankingData(data);
    } catch (err: any) {
      console.error('Error fetching domain ranking:', err);
      setRankingError(err.message);
    } finally {
      setRankingLoading(false);
    }
  };

  const fetchBrandNews = async (brandName: string) => {
    setNewsLoading(true);
    setNewsError('');
    try {
      const articles = await getBrandNews(brandName);
      setNews(articles);
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setNewsError(err.message);
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchBrandDetails = async () => {
    try {
      if (!brandSlug) {
        throw new Error('Brand ID is required');
      }

      // Try to parse the slug as a number first
      const brandId = parseInt(brandSlug);
      let query = supabase.from('brands').select('*');

      // Non-admin users can only see approved brands
      if (!isAdmin) {
        query = query.eq('approval_status', 'approved');
      }

      if (!isNaN(brandId)) {
        // If it's a valid number, search by ID
        query = query.eq('id', brandId);
      } else {
        // If not a number, search by name
        const brandName = decodeURIComponent(brandSlug.replace(/-/g, ' '));
        query = query.ilike('name', brandName);
      }

      const { data, error: queryError } = await query.maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        throw new Error(isAdmin ? 'Brand not found' : 'Brand not found or not approved');
      }

      setBrand(data);
    } catch (err: any) {
      console.error('Error fetching brand details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!brand) return;

    setApprovalLoading(true);
    setError('');
    
    try {
      // First check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('auth_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.is_admin) throw new Error('Not authorized');

      // Now try to update the brand
      const { error: updateError } = await supabase
        .from('brands')
        .update({ 
          approval_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', brand.id);

      if (updateError) throw updateError;

      setApprovalSuccess(true);
      setBrand({ ...brand, approval_status: 'approved' });

      // Show success message for 3 seconds
      setTimeout(() => {
        setApprovalSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error approving brand:', err);
      setError(err.message || 'Failed to approve brand');
    } finally {
      setApprovalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
            <div className="text-gray-400">Loading brand details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="min-h-screen bg-gray-900">
        <GlobalNav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-800 rounded-lg shadow-lg p-8 text-center border border-gray-700">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Brand Not Found</h1>
            <p className="text-gray-400 mb-2">
              {error || "The brand you're looking for doesn't exist or has been removed."}
            </p>
            {error && (
              <p className="text-sm text-gray-500 mb-6">
                Error code: {error.includes('not found') ? '404' : '500'}
              </p>
            )}
            <Link
              to="/"
              className="inline-flex items-center text-teal-400 hover:text-teal-300"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Brands
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <GlobalNav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-400">
            <li>
              <Link to="/" className="hover:text-gray-300">Brands</Link>
            </li>
            <li>
              <span className="mx-2">/</span>
            </li>
            <li className="text-gray-200 font-medium truncate">
              {brand.name}
            </li>
          </ol>
        </nav>

        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6 border border-gray-700">
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold text-gray-100">{brand.name}</h1>
                  {brand.approval_status === 'pending' && (
                    <span className="px-2 py-1 text-sm font-medium bg-yellow-900/50 text-yellow-200 rounded-full border border-yellow-700/50">
                      PENDING
                    </span>
                  )}
                  <FavoriteButton brandId={brand.id} />
                </div>
                <p className="text-lg text-gray-400 mb-4">{brand.creators}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {brand.product_category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(brand.product_category).bg} ${getCategoryColor(brand.product_category).text}`}>
                      <Package className="w-4 h-4 mr-1" />
                      {brand.product_category}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    brand.brand_collab 
                      ? 'bg-purple-900/50 text-purple-200 border border-purple-700/50'
                      : 'bg-green-900/50 text-green-200 border border-green-700/50'
                  }`}>
                    {brand.brand_collab ? 'Collaboration Brand' : 'Own Brand'}
                  </span>
                </div>

                {isAdmin && brand.approval_status === 'pending' && (
                  <div className="mt-4">
                    <Button 
                      onClick={handleApprove}
                      isLoading={approvalLoading}
                    >
                      Approve Brand
                    </Button>
                    {approvalSuccess && (
                      <p className="mt-2 text-sm text-green-400">
                        Brand has been approved successfully!
                      </p>
                    )}
                    {error && (
                      <p className="mt-2 text-sm text-red-400">
                        Error: {error}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {brand.logo_url && (
                <img
                  src={brand.logo_url}
                  alt={`${brand.name} logo`}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    console.error('Error loading brand logo:', e);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">About</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{brand.description}</p>
              {brand.brand_story ? (
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">Brand Story</h3>
                    <p className="text-gray-300 italic mb-4">{brand.brand_story.summary}</p>
                    {brand.last_story_update && (
                      <p className="text-sm text-gray-500 mb-4">
                        Story written on {new Date(brand.last_story_update).toLocaleDateString()}
                      </p>
                    )}
                    <div className="space-y-4">
                      {brand.brand_story.full_story.map((paragraph, index) => (
                        <p key={index} className="text-gray-300">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  {brand.brand_story.key_events.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">Key Milestones</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {brand.brand_story.key_events.map((event, index) => (
                          <li key={index} className="text-gray-300">{event}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={generateBrandStory}
                    isLoading={isGeneratingStory}
                    className="flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Generate Brand Story
                  </Button>
                  {storyError && (
                    <p className="text-sm text-red-400">{storyError}</p>
                  )}
                </div>
              )}
            </div>

            <DomainRanking
              data={rankingData}
              isLoading={rankingLoading}
              error={rankingError}
            />

            <TrendChart
              data={trendData}
              isLoading={trendLoading}
              error={trendError}
            />

            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-100">Recent News</h2>
              </div>
              
              {newsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading news...</p>
                </div>
              ) : newsError ? (
                <div className="bg-red-900/50 text-red-200 p-4 rounded-lg border border-red-700/50">
                  {newsError}
                </div>
              ) : news.length === 0 ? (
                <p className="text-gray-400 py-4">No recent news found for this brand.</p>
              ) : (
                <div className="space-y-4">
                  {news.map((article, index) => (
                    <div key={index} className="border-b border-gray-700 last:border-0 pb-4 last:pb-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:bg-gray-700 rounded-lg transition-colors duration-200 -mx-2 px-2 py-1"
                      >
                        <h3 className="text-lg font-medium text-gray-100 hover:text-teal-400 mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">{article.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{article.source}</span>
                          <span>•</span>
                          <span>{new Date(article.published_at).toLocaleDateString()}</span>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Brand Information</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-400">Founded</dt>
                  <dd className="mt-1 flex items-center text-sm text-gray-300">
                    <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                    {brand.year_founded}
                  </dd>
                </div>

                {brand.year_discontinued && (
                  <div>
                    <dt className="text-sm font-medium text-gray-400">Discontinued</dt>
                    <dd className="mt-1 flex items-center text-sm text-gray-300">
                      <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                      {brand.year_discontinued}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-medium text-gray-400">Founder Type</dt>
                  <dd className="mt-1 flex items-center text-sm text-gray-300">
                    <Building2 className="w-4 h-4 mr-1 text-gray-500" />
                    {brand.type_of_influencer}
                  </dd>
                </div>

                {brand.homepage_url && (
                  <div>
                    <dt className="text-sm font-medium text-gray-400">Website</dt>
                    <dd className="mt-1">
                      <a
                        href={brand.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm text-teal-400 hover:text-teal-300"
                      >
                        <Globe className="w-4 h-4 mr-1" />
                        {brand.homepage_url}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {brand.social_links && Object.keys(brand.social_links).length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Social Media</h2>
                <div className="space-y-2">
                  {Object.entries(brand.social_links).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-gray-400 hover:text-gray-200"
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}