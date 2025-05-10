import { z } from 'zod';

export const founderTypeSchema = z.object({
  category: z.enum([
    'Actor/Celebrity',
    'Musician/Artist',
    'Athlete/Sports',
    'Content Creator',
    'Business/Entrepreneur',
    'Chef/Culinary',
    'Designer/Fashion',
    'Expert/Professional',
    'Model/Influencer',
    'TV/Media Personality'
  ]),
  subtype: z.string().optional(),
  platform: z.enum([
    'YouTube',
    'Instagram',
    'TikTok',
    'Twitch',
    'Traditional Media',
    'Multiple Platforms'
  ]).optional(),
  reach: z.enum(['Micro', 'Macro', 'Mega', 'Celebrity']).optional()
});

export type FounderType = z.infer<typeof founderTypeSchema>;

export const searchParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: founderTypeSchema.shape.category.optional(),
  platform: founderTypeSchema.shape.platform.optional(),
  reach: founderTypeSchema.shape.reach.optional(),
  yearStart: z.number().int().optional(),
  yearEnd: z.number().int().optional(),
  sortBy: z.enum(['name', 'year_founded', 'relevance']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export const buildFilterQuery = (params: SearchParams) => {
  let query = supabase
    .from('brands')
    .select('*', { count: 'exact' });

  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,creators.ilike.%${params.search}%`);
  }

  if (params.category) {
    query = query.eq('founder_category', params.category);
  }

  if (params.platform) {
    query = query.eq('primary_platform', params.platform);
  }

  if (params.reach) {
    query = query.eq('influencer_reach', params.reach);
  }

  if (params.yearStart) {
    query = query.gte('year_founded', params.yearStart);
  }

  if (params.yearEnd) {
    query = query.lte('year_founded', params.yearEnd);
  }

  // Add sorting
  query = query.order(params.sortBy, {
    ascending: params.sortOrder === 'asc'
  });

  // Add pagination
  query = query
    .range((params.page - 1) * params.limit, params.page * params.limit - 1);

  return query;
};