-- ============================================================
-- Phase 12: Stripe Payment Integration
-- ============================================================

-- Add Stripe customer ID to users (for parents making payments)
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Add Stripe payment intent ID to payments (for tracking Stripe transactions)
ALTER TABLE payments ADD COLUMN stripe_payment_intent_id TEXT;
