-- Update Monthly Subscription price ID to new live-mode Stripe price
UPDATE membership_plans
SET stripe_price_id = 'price_1TEem62MuEf3uwqOKn0YdlJn'
WHERE stripe_price_id = 'price_1TAayy2MuEf3uwqONTkdTKH3';
