import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getBrandNews } from '../lib/newsApi';

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
      let query = supabase.from('brands').select('*');

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

    setIsGeneratingStory(true);
    setStoryError(null);

    try {
      const endpoint = version === 'v1' ? 'generate-brand-story' : 'generate-brand-story-v2';
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ brandId: brand.id, notes })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate brand story');
      }
        
      const result = await response.json();
      if (!result) {
        throw new Error('Empty response from story generator');
      }

      await fetchBrandDetails();
    } catch (err: any) {
      console.error('Error generating brand story:', err);
      setStoryError(err.error || err.message || 'Failed to generate brand story');
    } finally {
      setIsGeneratingStory(false);
    }
  }, [brand, fetchBrandDetails]);

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