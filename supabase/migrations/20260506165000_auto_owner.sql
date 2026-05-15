-- When someone creates a project, auto-add them to project_members as owner.
-- Without this, PM/Lead-created projects would be invisible to their own creator
-- (RLS hides projects you're not a member of).
-- Idempotent.

CREATE OR REPLACE FUNCTION public.add_creator_as_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role_in_project, added_by)
    VALUES (NEW.id, auth.uid(), 'owner', auth.uid())
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_add_creator_as_owner ON public.products;
CREATE TRIGGER products_add_creator_as_owner
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_owner();
