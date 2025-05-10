import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  auth_id: z.string(),
  email: z.string().email(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company: z.string().nullable(),
  is_admin: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export interface AuthState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
}