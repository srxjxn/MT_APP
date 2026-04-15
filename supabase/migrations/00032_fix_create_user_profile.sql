-- Fix: Replace ON CONFLICT DO UPDATE with DO NOTHING + separate SELECT.
-- PostgreSQL's UPSERT (INSERT...ON CONFLICT DO UPDATE) requires UPDATE RLS policies
-- to be evaluable at plan time, even inside SECURITY DEFINER functions in some
-- Supabase/PostgREST configurations. Using DO NOTHING avoids this entirely.
CREATE OR REPLACE FUNCTION create_user_profile(
  p_auth_id UUID,
  p_org_id UUID,
  p_role user_role,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the user being registered
  IF p_auth_id != auth.uid() THEN
    RAISE EXCEPTION 'auth_id mismatch';
  END IF;

  -- Try insert; if row already exists (race condition), silently skip
  INSERT INTO users (auth_id, org_id, role, first_name, last_name, email, phone, is_active)
  VALUES (p_auth_id, p_org_id, p_role, p_first_name, p_last_name, p_email, NULL, p_is_active)
  ON CONFLICT (auth_id) DO NOTHING;

  -- Always return the row (whether just inserted or already existing)
  RETURN QUERY
  SELECT * FROM users WHERE auth_id = p_auth_id;
END;
$$;
