-- `current_role` is a reserved SQL keyword in PostgreSQL — qualifying as
-- `public.current_role()` doesn't reliably resolve to our function inside
-- policy expressions, so the products_create check silently fails. Rename
-- the helper to `app_role()` and recreate dependent policies with explicit
-- inline checks (cheap and unambiguous). Idempotent.

-- New helper.
CREATE OR REPLACE FUNCTION public.app_role()
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND NOT deactivated;
$$;

-- Drop old helper (after dropping its dependents).
DROP POLICY IF EXISTS products_create ON public.products;
DROP FUNCTION IF EXISTS public.current_role();

-- Recreate products_create with an inline EXISTS check — no helper-name
-- ambiguity, no surprise.
CREATE POLICY products_create ON public.products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager', 'design_lead')
        AND NOT deactivated
    )
  );
