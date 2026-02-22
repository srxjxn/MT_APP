-- ============================================================
-- Phase 9: Billing Overhaul — Memberships + Package Billing
-- ============================================================

-- Track billing status on student packages
ALTER TABLE student_packages ADD COLUMN needs_billing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE student_packages ADD COLUMN billed_at TIMESTAMPTZ;

-- Link subscriptions to specific students
ALTER TABLE subscriptions ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX idx_subscriptions_student_id ON subscriptions(student_id);
