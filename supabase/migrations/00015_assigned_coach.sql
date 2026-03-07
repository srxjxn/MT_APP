-- Add assigned_coach_id to users table so admin can assign a coach to each parent/family
ALTER TABLE users ADD COLUMN assigned_coach_id UUID REFERENCES users(id);
