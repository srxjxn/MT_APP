-- Update membership plan for production: rename, set correct price, and add live-mode Stripe price ID
-- Live-mode price: tiered $225 first student / $175 additional, 4-week recurring
UPDATE membership_plans
SET name = 'Monthly Subscription',
    price_cents = 22500,
    stripe_price_id = 'price_1TAayy2MuEf3uwqONTkdTKH3'
WHERE name = 'Monthly Group';
