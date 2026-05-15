-- Switch from allowlist-gated signup to domain-gated open signup.
-- Anyone with @humanx.io or @juicelabs.ai email can sign up and gets the
-- 'designer' role by default. The 4 seeded admins (and any explicit
-- allowlist entry with a non-default role) keep the override behaviour.
-- New self-signups don't carry must_change_password (they just chose
-- their own password).
-- Idempotent.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email_domain   TEXT;
  v_role           app_role;
  v_allowlist_role app_role;
  v_must_change    BOOLEAN := FALSE;
BEGIN
  v_email_domain := split_part(lower(NEW.email), '@', 2);

  -- 1. Allowlist override (still wins) — used to bootstrap admins and
  --    any cross-org collaborators with a non-default role.
  SELECT default_role INTO v_allowlist_role
  FROM public.allowlist
  WHERE lower(email) = lower(NEW.email);

  IF v_allowlist_role IS NOT NULL THEN
    v_role := v_allowlist_role;
    -- Bootstrap admins still get the forced first-login flow.
    v_must_change := TRUE;
  -- 2. Otherwise, open signup gated by domain. Default role: designer.
  ELSIF v_email_domain IN ('humanx.io', 'juicelabs.ai') THEN
    v_role := 'designer';
    v_must_change := FALSE;
  ELSE
    RAISE EXCEPTION
      'Sign-up restricted to @humanx.io or @juicelabs.ai emails'
      USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.profiles (id, email, role, must_change_password)
  VALUES (NEW.id, NEW.email, v_role, v_must_change)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
