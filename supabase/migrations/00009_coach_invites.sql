-- Coach invite system
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'coach',
  invited_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, email, status)
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Owner/admin can see all invites in their org
CREATE POLICY "Owner/Admin can view invites in org"
  ON invites FOR SELECT
  USING (invites.org_id = get_user_org_id() AND get_user_role() IN ('owner','admin'));

-- Users can see invites matching their email (for sign-up check)
CREATE POLICY "Users can view own invites"
  ON invites FOR SELECT
  USING (lower(invites.email) = lower(auth.jwt() ->> 'email'));

-- Owner/admin can create invites
CREATE POLICY "Owner/Admin can create invites"
  ON invites FOR INSERT
  WITH CHECK (invites.org_id = get_user_org_id() AND get_user_role() IN ('owner','admin'));

-- Owner/admin can update invites (revoke)
CREATE POLICY "Owner/Admin can update invites"
  ON invites FOR UPDATE
  USING (invites.org_id = get_user_org_id() AND get_user_role() IN ('owner','admin'));

-- Users can accept their own invite
CREATE POLICY "Users can accept own invites"
  ON invites FOR UPDATE
  USING (lower(invites.email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(invites.email) = lower(auth.jwt() ->> 'email'));

-- Trigger for updated_at
CREATE TRIGGER set_invites_updated_at BEFORE UPDATE ON invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
