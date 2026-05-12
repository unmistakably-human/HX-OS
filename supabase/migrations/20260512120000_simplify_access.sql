-- Simplify access model per feedback (2026-05-12):
--   * Merge project_manager into product_lead (renamed from design_lead)
--   * Drop phase_access column (per-member tickboxes removed)
--   * Drop role_in_project semantics — keep 'owner' only as a "can't remove
--     yourself" marker; everything else uses the global role
--   * Designers cannot delete features (split features RLS)
--   * Project creation handled by a server action (service-role) — drop the
--     trigger and the first-owner policy that worked around it
-- Idempotent.

-- ─── 1. Migrate project_manager rows (none expected, safe to run) ──────
UPDATE public.profiles  SET role         = 'design_lead' WHERE role         = 'project_manager';
UPDATE public.allowlist SET default_role = 'design_lead' WHERE default_role = 'project_manager';

-- ─── 2. Rename design_lead → product_lead in the enum ──────────────────
-- (Skips if rename already happened. project_manager is left in the enum
-- but unused; PG doesn't allow dropping enum values cleanly.)
DO $$ BEGIN
  ALTER TYPE app_role RENAME VALUE 'design_lead' TO 'product_lead';
EXCEPTION WHEN invalid_parameter_value THEN NULL; END $$;

-- ─── 3. Drop phase_access column ───────────────────────────────────────
ALTER TABLE public.project_members DROP COLUMN IF EXISTS phase_access;

-- ─── 4. Refresh products_create policy with new role names ─────────────
DROP POLICY IF EXISTS products_create ON public.products;
CREATE POLICY products_create ON public.products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'product_lead')
        AND NOT deactivated
    )
  );

-- ─── 5. Refine features RLS — designers can read/insert/update, NOT delete
DROP POLICY IF EXISTS features_member_all ON public.features;
DROP POLICY IF EXISTS features_member_select ON public.features;
DROP POLICY IF EXISTS features_member_insert ON public.features;
DROP POLICY IF EXISTS features_member_update ON public.features;
DROP POLICY IF EXISTS features_lead_delete  ON public.features;

CREATE POLICY features_member_select ON public.features
  FOR SELECT USING (public.is_project_member(product_id));

CREATE POLICY features_member_insert ON public.features
  FOR INSERT WITH CHECK (public.is_project_member(product_id));

CREATE POLICY features_member_update ON public.features
  FOR UPDATE USING (public.is_project_member(product_id))
  WITH CHECK (public.is_project_member(product_id));

CREATE POLICY features_lead_delete ON public.features
  FOR DELETE USING (
    public.is_project_member(product_id)
    AND public.app_role() IN ('admin', 'product_lead')
  );

-- ─── 6. Drop the trigger and first-owner workaround ────────────────────
-- Project creation now happens via a server action that uses service_role
-- to atomically insert (product + project_members) — no trigger needed.
DROP TRIGGER  IF EXISTS products_add_creator_as_owner ON public.products;
DROP FUNCTION IF EXISTS public.add_creator_as_owner();
DROP POLICY   IF EXISTS pm_first_owner_self ON public.project_members;

-- ─── 7. Restrict project deletion to admin + project creator ('owner') ─
-- Already covered by products_owner_delete (role_in_project='owner') and
-- products_admin_all. Keep both. Designers and other leads cannot delete.
-- (No change needed here; documenting for clarity.)
