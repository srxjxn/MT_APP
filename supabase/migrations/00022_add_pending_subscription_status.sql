-- Add 'pending' to subscription_status enum for subscriptions awaiting payment
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';
