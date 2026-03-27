-- Migration: Tiered pricing support
-- Changes:
--   1. Drop UNIQUE index on stripe_subscription_id (multiple local subs can share one Stripe sub)
--   2. Add price_cents_additional column to membership_plans for tiered display

-- 1. Replace unique index with non-unique index
DROP INDEX idx_subscriptions_stripe_sub_id;
CREATE INDEX idx_subscriptions_stripe_sub_id
  ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- 2. Add additional-student price column
ALTER TABLE membership_plans ADD COLUMN price_cents_additional INTEGER;
UPDATE membership_plans SET price_cents_additional = 17500 WHERE name = 'Monthly Subscription';
