/*
  # Make robgabel@gmail.com an administrator

  1. Changes
    - Updates user_profiles table to set robgabel@gmail.com as an administrator
    - Uses email to match the user profile

  2. Security
    - Maintains existing RLS policies
    - No security changes needed as this is a data update only
*/

-- Update the user profile for robgabel@gmail.com to be an admin
UPDATE public.user_profiles
SET is_admin = true
WHERE email = 'robgabel@gmail.com';