-- SECURITY DEFINER function to create user profiles, bypassing RLS.
-- Needed because PostgREST translates .insert() into an UPSERT (INSERT...ON CONFLICT DO UPDATE),
-- which requires UPDATE RLS policies to pass. New users have no role yet, so UPDATE policies fail.
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

  -- Insert or return existing (handle race condition)
  RETURN QUERY
  INSERT INTO users (auth_id, org_id, role, first_name, last_name, email, phone, is_active)
  VALUES (p_auth_id, p_org_id, p_role, p_first_name, p_last_name, p_email, NULL, p_is_active)
  ON CONFLICT (auth_id) DO UPDATE SET auth_id = EXCLUDED.auth_id  -- no-op, just return the row
  RETURNING *;
END;
$$;
