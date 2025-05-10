import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company: z.string().nullable(),
  is_admin: z.boolean().default(false),
});

// Brand schema
export const brandSchema = z.object({
  id: z.number(),
  name: z.string(),
  creators: z.string(),
  product_category: z.string(),
  description: z.string(),
  year_founded: z.number(),
  type_of_influencer: z.string(),
  brand_collab: z.boolean(),
  logo_url: z.string().url().nullable(),
  homepage_url: z.string().url().nullable(),
  social_links: z.record(z.string(), z.string().url()).nullable(),
  approval_status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
});

// Goal schema
export const goalSchema = z.object({
  id: z.string().uuid(),
  note: z.string(),
  brand_id: z.number().nullable(),
  goal_type: z.enum(['research', 'contact', 'investment', 'collaboration', 'other']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  created_at: z.string().datetime(),
});

// Comment schema
export const commentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_id: z.number(),
  content: z.string(),
  created_at: z.string().datetime(),
});

// Report schema
export const reportSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_id: z.number(),
  issue_type: z.string(),
  description: z.string(),
  status: z.string(),
  created_at: z.string().datetime(),
});

// Brand suggestion schema
export const brandSuggestionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  brand_name: z.string(),
  creators: z.string(),
  product_category: z.string(),
  description: z.string(),
  year_founded: z.number(),
  status: z.string(),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;
export type Brand = z.infer<typeof brandSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Report = z.infer<typeof reportSchema>;
export type BrandSuggestion = z.infer<typeof brandSuggestionSchema>;