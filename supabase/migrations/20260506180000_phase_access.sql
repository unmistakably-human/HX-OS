-- Per-member phase-level access. Each project_member gets a JSONB blob
-- indicating which phases of the project they can read/write:
--   { "context": bool, "discovery": bool, "features": bool }
-- Defaults to full access. Owners always have full access; the UI enforces this.
-- Idempotent.

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS phase_access JSONB NOT NULL
    DEFAULT '{"context": true, "discovery": true, "features": true}'::jsonb;

-- Backfill existing rows that were created before this column existed.
UPDATE public.project_members
SET phase_access = '{"context": true, "discovery": true, "features": true}'::jsonb
WHERE phase_access IS NULL OR phase_access = '{}'::jsonb;
