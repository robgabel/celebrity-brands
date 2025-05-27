import { z } from 'zod';

const brandSchema = z.object({
  id: z.number(),
  name: z.string(),
  creators: z.string(),
  product_category: z.string(),
  description: z.string(),
  year_founded: z.number(),
  year_discontinued: z.number().nullable(),
  brand_collab: z.boolean(),
  type_of_influencer: z.string(),
  logo_url: z.string().url().nullable(),
  homepage_url: z.string().url().nullable(),
  wikipedia_url: z.string().url().nullable(),
  social_links: z.record(z.string(), z.string().url()).nullable(),
  approval_status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type Brand = z.infer<typeof brandSchema>;

interface BrandFilters {
  search?: string;
  category?: string;
  founderType?: string;
  brandType?: 'All Types' | 'Own' | 'Collab';
  sortBy?: 'name' | 'year_founded';
  showFavoritesOnly?: boolean;
}

interface BrandPagination {
  page: number;
  limit: number;
  total: number;
}