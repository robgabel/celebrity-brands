import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getBrandNews } from '../lib/newsApi';
import { useToastStore } from '../stores/toastStore';

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

interface UseBrandDetailsDataReturn {
  brand: Brand | null;
  loading: boolean;
  error: string;
  news: NewsArticle[];
  newsLoading: boolean;
  newsError: string;
  isAdmin: boolean;
  approvalLoading: boolean;
  approvalSuccess: boolean;
  isGeneratingStory: boolean;
  storyError: string | null;
  handleApprove: () => Promise<void>;
  generateBrandStory: () => void;
  handleGenerateStory: (version: 'v1' | 'v2', notes?: string) => Promise<void>;
  fetchBrandDetails: () => Promise<void>;
}

export function useBrandDetailsData(): UseBrandDetailsDataReturn {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const addToast = useToastStore(state => state.addToast);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  const checkAdminStatus = useCallback(async () => {
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
  }, []);

  const fetchBrandNews = useCallback(async (brandName: string) => {
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
  }, []);

  const fetchBrandDetails = useCallback(async () => {
    try {
      if (!brandSlug) {
        throw new Error('Brand ID is required');
      }

      const brandId = parseInt(brandSlug);
      let query = supabase.from('brands').select(`
        id,
        name,
        creators,
        product_category,
        description,
        year_founded,
        year_discontinued,
        type_of_influencer,
        brand_collab,
        logo_url,
        homepage_url,
        social_links,
        approval_status,
        brand_story,
        last_story_update,
        created_at,
        updated_at
      `);

      if (!isAdmin) {
        query = query.eq('approval_status', 'approved');
      }

      if (!isNaN(brandId)) {
        query = query.eq('id', brandId);
      } else {
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
  }, [brandSlug, isAdmin]);

  const handleApprove = useCallback(async () => {
    if (!brand) return;

    setApprovalLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('auth_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.is_admin) throw new Error('Not authorized');

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

      setTimeout(() => {
        setApprovalSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error approving brand:', err);
      setError(err.message || 'Failed to approve brand');
    } finally {
      setApprovalLoading(false);
    }
  }, [brand]);

  const generateBrandStory = useCallback(() => {
    // This will be handled by the component that uses this hook
  }, []);

  const handleGenerateStory = useCallback(async (version: 'v1' | 'v2', notes?: string) => {
    if (!brand) return;

    // Show toast notification that Petra is working
    const toastId = addToast({
      message: "Petra is researching and writing the brand story",
      type: 'info',
      duration: 0 // Don't auto-dismiss, we'll remove it manually
    });

    setIsGeneratingStory(true);
    setStoryError(null);

    try {
      console.log('🚀 Starting story generation:', { version, brandId: brand.id, hasNotes: !!notes });
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-brand-story`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            brandId: brand.id, 
            notes: notes?.trim() || undefined,
            version 
          })
        }
      );

      console.log('📡 Response received:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('❌ Server error response:', errorData);
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError);
          const errorText = await response.text();
          console.error('❌ Raw error response:', errorText);
        }
        
        throw new Error(errorMessage);
      }
        
      let result;
      try {
        result = await response.json();
        console.log('✅ Story generation successful:', {
          hasStory: !!result.story,
          version: result.version,
          success: result.success
        });
      } catch (parseError) {
        console.error('❌ Could not parse success response:', parseError);
        throw new Error('Invalid response format from story generator');
      }
      
      if (!result) {
        throw new Error('Empty response from story generator');
      }

      // Refresh the brand details to show the new story
      console.log('🔄 Refreshing brand details...');
      await fetchBrandDetails();
      
      // Remove the working toast and show success
      useToastStore.getState().removeToast(toastId);
      addToast({
        message: `Brand story generated successfully using ${version === 'v2' ? 'Zero to Hero' : 'Classic'} format!`,
        type: 'success',
        duration: 5000
      });
      
    } catch (err: any) {
      console.error('Error generating brand story:', err);
      
      // Provide user-friendly error messages
      let userMessage = err.message || 'Failed to generate brand story';
      
      if (err.message?.includes('rate limit')) {
        userMessage = 'Rate limit exceeded. Please wait a few minutes before trying again.';
      } else if (err.message?.includes('Authentication failed')) {
        userMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (err.message?.includes('Network error') || err.message?.includes('Failed to fetch')) {
        userMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      
      setStoryError(userMessage);
      
      // Remove the working toast and show error
      useToastStore.getState().removeToast(toastId);
      addToast({
        message: `Failed to generate brand story: ${userMessage}`,
        type: 'error',
        duration: 8000
      });
    } finally {
      setIsGeneratingStory(false);
    }
  }, [brand, fetchBrandDetails, addToast]);

  useEffect(() => {
    checkAdminStatus();
    fetchBrandDetails();
  }, [checkAdminStatus, fetchBrandDetails]);

  useEffect(() => {
    if (brand) {
      fetchBrandNews(brand.name);
    }
  }, [brand, fetchBrandNews]);

  return {
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
    generateBrandStory,
    handleGenerateStory,
    fetchBrandDetails
  };
}