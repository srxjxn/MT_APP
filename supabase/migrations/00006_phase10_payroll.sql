-- ============================================================
-- Phase 10: Coach Payroll
-- ============================================================

-- Payout status enum
CREATE TYPE payout_status AS ENUM ('draft', 'approved', 'paid');

-- Coach payouts table
CREATE TABLE coach_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  group_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  private_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  group_rate_cents INTEGER NOT NULL DEFAULT 0,
  private_rate_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status payout_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coach_payouts_org_id ON coach_payouts(org_id);
CREATE INDEX idx_coach_payouts_coach_id ON coach_payouts(coach_id);

-- RLS policies for coach_payouts
ALTER TABLE coach_payouts ENABLE ROW LEVEL SECURITY;

-- Owner/admin can CRUD all in org
CREATE POLICY "coach_payouts_admin_select" ON coach_payouts
  FOR SELECT USING (
    coach_payouts.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "coach_payouts_admin_insert" ON coach_payouts
  FOR INSERT WITH CHECK (
    coach_payouts.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "coach_payouts_admin_update" ON coach_payouts
  FOR UPDATE USING (
    coach_payouts.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "coach_payouts_admin_delete" ON coach_payouts
  FOR DELETE USING (
    coach_payouts.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- Coach can view own payouts
CREATE POLICY "coach_payouts_coach_select" ON coach_payouts
  FOR SELECT USING (
    coach_payouts.org_id = get_user_org_id()
    AND coach_payouts.coach_id = get_user_id()
    AND get_user_role() = 'coach'
  );
