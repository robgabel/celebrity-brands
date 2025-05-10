/*
  # Update goals table for brand tracking

  1. Changes
    - Renames 'title' to 'note' for clarity
    - Adds brand_id reference
    - Adds goal_type enum for categorization
    - Adds status field for tracking progress

  2. Security
    - Maintains existing RLS policies
    - Adds foreign key constraint to brands table
*/

-- Add new columns and constraints
ALTER TABLE public.goals
  -- Rename title to note for clarity
  RENAME COLUMN title TO note;

-- Add goal type enum
DO $$ BEGIN
  CREATE TYPE goal_type AS ENUM (
    'research',      -- For tracking brands to research
    'contact',       -- For tracking outreach to brands/creators
    'investment',    -- For tracking potential investment opportunities
    'collaboration', -- For tracking potential brand collaborations
    'other'         -- For miscellaneous goals
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns
ALTER TABLE public.goals 
  ADD COLUMN IF NOT EXISTS brand_id bigint REFERENCES public.brands(id),
  ADD COLUMN IF NOT EXISTS goal_type goal_type NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Add index for brand lookups
CREATE INDEX IF NOT EXISTS idx_goals_brand_id ON public.goals(brand_id);