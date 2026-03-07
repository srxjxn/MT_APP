-- ============================================================
-- Membership Plans table + parent self-subscribe RLS
-- ============================================================

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  lessons_per_month INTEGER,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_membership_plans_org_id ON membership_plans(org_id);

CREATE TRIGGER set_membership_plans_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

-- Admin/owner full access
CREATE POLICY "Owner/Admin can manage membership_plans"
  ON membership_plans FOR ALL
  USING (membership_plans.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

-- Parents can browse active plans in their org
CREATE POLICY "Parents can view active membership plans"
  ON membership_plans FOR SELECT
  USING (membership_plans.org_id = get_user_org_id() AND membership_plans.is_active = TRUE);

-- Parents can create their own subscriptions
CREATE POLICY "Parents can create their own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (subscriptions.org_id = get_user_org_id() AND subscriptions.user_id = get_user_id());
