-- Production seed: ensure the Modern Tennis organization exists.
-- Uses ON CONFLICT DO NOTHING so it's safe to run on both local and production.

INSERT INTO organizations (id, name, slug, email, phone, address, timezone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Modern Tennis',
  'modern-tennis',
  'info@moderntennis.com',
  '555-0100',
  '123 Tennis Lane, Sportsville, CA 90210',
  'America/Los_Angeles'
)
ON CONFLICT (id) DO NOTHING;
