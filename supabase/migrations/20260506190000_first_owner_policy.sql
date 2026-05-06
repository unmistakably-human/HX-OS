-- The auto-owner trigger inserts a row into project_members when a project
-- is created, but RLS blocks it because the creator isn't a member yet
-- (and SECURITY DEFINER doesn't bypass RLS in Supabase's default setup).
-- This narrow policy allows a user to add themselves as 'owner' only when
-- no project_members exist for that project — i.e., the brand-new-project
-- case the trigger fires for. Idempotent.

DROP POLICY IF EXISTS pm_first_owner_self ON public.project_members;
CREATE POLICY pm_first_owner_self ON public.project_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role_in_project = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
    )
  );
