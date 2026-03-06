-- Fix: Add WITH CHECK to owner/admin invite update policy
-- Without it, revoking invites was silently blocked by RLS
DROP POLICY "Owner/Admin can update invites" ON invites;

CREATE POLICY "Owner/Admin can update invites"
  ON invites FOR UPDATE
  USING (invites.org_id = get_user_org_id() AND get_user_role() IN ('owner','admin'))
  WITH CHECK (invites.org_id = get_user_org_id() AND get_user_role() IN ('owner','admin'));
