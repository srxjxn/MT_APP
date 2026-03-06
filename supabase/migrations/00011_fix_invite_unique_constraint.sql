-- Fix: Allow multiple revoked invites for the same email
-- Only enforce uniqueness for pending invites
ALTER TABLE invites DROP CONSTRAINT invites_org_id_email_status_key;

CREATE UNIQUE INDEX invites_one_pending_per_email
  ON invites (org_id, email)
  WHERE status = 'pending';
