export const APP_CONFIG = {
  ITEMS_PER_PAGE: 25,
  MAX_ITEMS_PER_PAGE: 100,
  SEARCH_DEBOUNCE_MS: 300,
  NEWS_CACHE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  BRAND_CATEGORIES: [
    'Alcoholic Beverages',
    'Beauty & Personal Care',
    'Beauty & Personal Care (Fragrance)',
    'Cannabis & CBD',
    'Entertainment & Media',
    'Fashion & Apparel',
    'Food & Soft Drinks',
    'Health & Fitness',
    'Home & Lifestyle',
    'Sporting Goods & Outdoor Gear',
    'Sports & Esports',
    'Tech & Electronics',
    'Tech & Software',
    'Toys, Games & Children\'s Products'
  ] as const
};

export const API_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  NEWS_API_KEY: import.meta.env.VITE_NEWS_API_KEY,
  NEWS_API_URL: 'https://api.thenewsapi.com/v1/news/all'
};