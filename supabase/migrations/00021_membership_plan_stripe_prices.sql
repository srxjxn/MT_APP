-- Update membership plans with Stripe price IDs for 4-week recurring billing
-- Replace placeholder values with real Stripe Price IDs (price_xxx) in production
UPDATE membership_plans SET stripe_price_id = 'price_monthly_group_placeholder' WHERE name = 'Monthly Group';
UPDATE membership_plans SET stripe_price_id = 'price_monthly_premium_placeholder' WHERE name = 'Monthly Premium';
