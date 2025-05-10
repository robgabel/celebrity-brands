import axios from 'axios';

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const NEWS_API_URL = 'https://api.thenewsapi.com/v1/news/all';

interface NewsArticle {
  title: string;
  url: string;
  description: string;
  image_url: string | null;
  published_at: string;
  source: string;
}

interface NewsApiResponse {
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
  data: Array<{
    uuid: string;
    title: string;
    description: string;
    keywords: string | null;
    snippet: string;
    url: string;
    image_url: string | null;
    language: string;
    published_at: string;
    source: string;
    categories: string[];
    relevance_score: number | null;
  }>;
}

export async function getBrandNews(brandName: string): Promise<NewsArticle[]> {
  try {
    console.log('Fetching news for:', brandName);
    
    // Remove special characters and add quotes for exact match
    const cleanBrandName = `"${brandName.replace(/[^\w\s]/gi, '').trim()}"`;
    console.log('Cleaned brand name:', cleanBrandName);

    const response = await axios.get<NewsApiResponse>(NEWS_API_URL, {
      params: {
        api_token: NEWS_API_KEY,
        search: cleanBrandName,
        language: 'en',
        limit: 5,
        sort: 'published_at',
        categories: 'business,entertainment',
        published_after: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last year
      }
    });

    console.log('API Response:', {
      meta: response.data.meta,
      articleCount: response.data.data?.length || 0
    });

    if (!response.data || !response.data.data) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Invalid response format from news API');
    }

    const articles: NewsArticle[] = response.data.data.map(article => ({
      title: article.title,
      url: article.url,
      description: article.description || article.snippet,
      image_url: article.image_url,
      published_at: article.published_at,
      source: article.source
    }));

    console.log('Processed articles:', articles.length);
    return articles;
  } catch (error: any) {
    console.error('Error fetching news:', {
      error: error.response?.data || error,
      status: error.response?.status,
      headers: error.response?.headers
    });

    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your configuration.');
    }

    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch news articles: ${error.message}`);
    }

    throw new Error('Failed to fetch news articles');
  }
}