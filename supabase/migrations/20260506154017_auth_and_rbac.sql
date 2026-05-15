-- Access management: roles, allowlist, project-scoped membership, RLS.
-- Roles: admin (sees everything) | project_manager | design_lead | designer.
-- Visibility: admins see all projects; everyone else only sees projects they're a member of.
-- Idempotent — safe to re-run.

-- ─── Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'project_manager', 'design_lead', 'designer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE project_role AS ENUM ('owner', 'lead', 'manager', 'designer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT,
  role                  app_role NOT NULL DEFAULT 'designer',
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role) WHERE NOT deactivated;

-- ─── allowlist ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.allowlist (
  email         TEXT PRIMARY KEY,
  default_role  app_role NOT NULL DEFAULT 'designer',
  added_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── project_members ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_project   project_role NOT NULL DEFAULT 'designer',
  added_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_user_idx ON public.project_members(user_id);

-- ─── Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion) ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND NOT deactivated
  );
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND NOT deactivated;
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role_in_project IN ('owner', 'lead', 'manager')
  );
$$;

-- ─── RLS: profiles ─────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_write ON public.profiles;
CREATE POLICY profiles_admin_write ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─── RLS: allowlist (admin-only) ───────────────────────────────────────
ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allowlist_admin_all ON public.allowlist;
CREATE POLICY allowlist_admin_all ON public.allowlist
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─── RLS: project_members ─────────────────────────────────────────────
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pm_admin_all ON public.project_members;
CREATE POLICY pm_admin_all ON public.project_members
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS pm_member_read ON public.project_members;
CREATE POLICY pm_member_read ON public.project_members
  FOR SELECT USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS pm_managers_write ON public.project_members;
CREATE POLICY pm_managers_write ON public.project_members
  FOR INSERT WITH CHECK (public.can_manage_project(project_id));

DROP POLICY IF EXISTS pm_managers_delete ON public.project_members;
CREATE POLICY pm_managers_delete ON public.project_members
  FOR DELETE USING (public.can_manage_project(project_id));

-- ─── RLS: products ─────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_admin_all ON public.products;
CREATE POLICY products_admin_all ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS products_member_read ON public.products;
CREATE POLICY products_member_read ON public.products
  FOR SELECT USING (public.is_project_member(id));

DROP POLICY IF EXISTS products_member_update ON public.products;
CREATE POLICY products_member_update ON public.products
  FOR UPDATE USING (public.is_project_member(id)) WITH CHECK (public.is_project_member(id));

DROP POLICY IF EXISTS products_create ON public.products;
CREATE POLICY products_create ON public.products
  FOR INSERT WITH CHECK (
    public.current_role() IN ('admin', 'project_manager', 'design_lead')
  );

DROP POLICY IF EXISTS products_owner_delete ON public.products;
CREATE POLICY products_owner_delete ON public.products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = id AND user_id = auth.uid() AND role_in_project = 'owner'
    )
  );

-- ─── RLS: features (scoped via product_id) ─────────────────────────────
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS features_admin_all ON public.features;
CREATE POLICY features_admin_all ON public.features
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS features_member_all ON public.features;
CREATE POLICY features_member_all ON public.features
  FOR ALL USING (public.is_project_member(product_id))
  WITH CHECK (public.is_project_member(product_id));

-- ─── RLS: knowledge (scoped via product_id) ────────────────────────────
ALTER TABLE public.knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_admin_all ON public.knowledge;
CREATE POLICY knowledge_admin_all ON public.knowledge
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS knowledge_member_all ON public.knowledge;
CREATE POLICY knowledge_member_all ON public.knowledge
  FOR ALL USING (public.is_project_member(product_id))
  WITH CHECK (public.is_project_member(product_id));

-- ─── RLS: reviews (no project FK; authenticated-only for now) ──────────
-- TODO: add project_id FK to reviews and tighten this.
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reviews_authenticated_all ON public.reviews;
CREATE POLICY reviews_authenticated_all ON public.reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Trigger: auto-create profile on signup, gated by allowlist ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT default_role INTO v_role
  FROM public.allowlist
  WHERE lower(email) = lower(NEW.email);

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Email % is not authorised', NEW.email USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (NEW.id, NEW.email, v_role, TRUE)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Trigger: keep profiles.updated_at fresh ───────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── Seed: admin allowlist entries ─────────────────────────────────────
INSERT INTO public.allowlist (email, default_role) VALUES
  ('jay.k@humanx.io',       'admin'),
  ('rishabh@juicelabs.ai',  'admin'),
  ('design@humanx.io',      'admin'),
  ('krupali@humanx.io',     'admin')
ON CONFLICT (email) DO UPDATE SET default_role = EXCLUDED.default_role;
