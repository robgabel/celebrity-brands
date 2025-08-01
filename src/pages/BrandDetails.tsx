import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, Globe, Calendar, Building2, Package, AlertCircle, Newspaper, BookOpen } from 'lucide-react';
import { FavoriteButton } from '../components/FavoriteButton';
import { getCategoryColor } from '../lib/categoryUtils';
import { GlobalNav } from '../components/GlobalNav';
import { NewsFeedback } from '../components/NewsFeedback';
import { Button } from '../components/Button';
import { StoryVersionDialog } from '../components/StoryVersionDialog';
import { ErrorMessage } from '../components/ErrorMessage';
import { useBrandDetailsData } from '../hooks/useBrandDetailsData';

export function BrandDetails() {
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  
  const {
    brand,
    loading,
    error,
    news,
    newsLoading,
    newsError,
    isAdmin,
    approvalLoading,
    approvalSuccess,
    isGeneratingStory,
    storyError,
    handleApprove,
    handleGenerateStory
  } = useBrandDetailsData();

  const generateBrandStory = () => {
    setShowVersionDialog(true);
  };

  const handleStoryGeneration = async (version: 'v1' | 'v2', notes?: string) => {
    setShowVersionDialog(false);
    await handleGenerateStory(version, notes);
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
      <Helmet>
        <title>{brand.name} Brand Analysis | Celebrity Brands Database</title>
        <meta name="description" content={`${brand.name} brand analysis - Founded by ${brand.creators} in ${brand.year_founded}. Get detailed insights, metrics, and brand story.`} />
        <meta name="keywords" content={`${brand.name}, ${brand.creators}, ${brand.product_category}, creator brands, brand analysis`} />
        
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": brand.name,
            "description": brand.description,
            "brand": {
              "@type": "Brand",
              "name": brand.name,
              "foundingDate": brand.year_founded,
              "founder": brand.creators
            },
            "category": brand.product_category
          })}
        </script>
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="mb-6">
        
        <StoryVersionDialog
          isOpen={showVersionDialog}
          onClose={() => setShowVersionDialog(false)}
          onSelect={handleStoryGeneration}
        />
        
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
                      <ErrorMessage message={error} className="mt-2" />
                    )}
                  </div>
                )}
              </div>
              {brand.logo_url && (
                <img
                  src={brand.logo_url}
                  alt={`${brand.name} logo`}
                  className="w-24 h-24 object-contain bg-gray-700/50 rounded-lg p-2"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    
                    const parent = img.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-24 h-24 bg-gray-700/50 rounded-lg flex items-center justify-center text-3xl font-bold text-gray-400';
                      fallback.textContent = brand.name.charAt(0).toUpperCase();
                      parent.appendChild(fallback);
                    }
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
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <span>Story written on {new Date(brand.last_story_update).toLocaleDateString()}</span>
                        <button
                          onClick={generateBrandStory}
                          disabled={isGeneratingStory}
                          className="text-teal-400 hover:text-teal-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                        >
                          {isGeneratingStory ? 'Refreshing...' : 'Refresh Brand Story'}
                        </button>
                      </div>
                    )}
                    <div className="space-y-4">
                      {Array.isArray(brand.brand_story.full_story) ? brand.brand_story.full_story.map((paragraph, index) => (
                        <p 
                          key={index} 
                          className={`text-gray-300 ${
                            (!paragraph.toLowerCase().includes('untitled section') && (
                              paragraph.endsWith(':') || 
                              (paragraph.split(' ').length <= 6 && 
                              paragraph === paragraph.trim() && 
                              (!paragraph.endsWith('.') || paragraph.includes(': ')))
                            ))
                              ? 'font-bold text-xl text-gray-100 mt-8 mb-4' 
                              : ''
                          }`}
                        >
                          {!paragraph.toLowerCase().includes('untitled section') ? paragraph : null}
                        </p>
                      )) : (
                        <p className="text-gray-300 whitespace-pre-wrap">
                          {brand.brand_story.full_story}
                        </p>
                      )}
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
                    <ErrorMessage message={storyError} className="text-sm" showIcon={false} />
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-100">Related News</h2>
              </div>
              
              {newsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-2"></div>
                  <p className="text-gray-400">Loading news...</p>
                </div>
              ) : newsError ? (
                <ErrorMessage message={newsError} />
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
                          <span>•</span>
                          <NewsFeedback
                            brandId={brand.id}
                            articleUrl={article.url}
                          />
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