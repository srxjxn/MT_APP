ALTER TABLE students ADD COLUMN assigned_coach_id UUID REFERENCES users(id);
