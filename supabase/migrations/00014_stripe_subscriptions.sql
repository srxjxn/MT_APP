-- ============================================================
-- Phase 14: Stripe Subscriptions + RLS Fix for Payments
-- ============================================================

-- Add Stripe subscription columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN stripe_price_id TEXT;
ALTER TABLE subscriptions ADD COLUMN current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Unique index for webhook lookups by stripe_subscription_id
CREATE UNIQUE INDEX idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Add Stripe invoice ID to payments for recurring invoice tracking
ALTER TABLE payments ADD COLUMN stripe_invoice_id TEXT;

-- RLS: Allow parents to insert their own payments (needed for external payment recording)
CREATE POLICY "Parents can insert their own payments"
  ON payments FOR INSERT
  WITH CHECK (
    payments.user_id = get_user_id()
    AND payments.org_id = get_user_org_id()
  );
