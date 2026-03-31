-- Migration: Add lesson_instance_coaches table for multi-coach group lessons
-- Allows tracking additional coaches assigned to a lesson instance beyond the lead coach

CREATE TABLE lesson_instance_coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lesson_instance_id UUID NOT NULL REFERENCES lesson_instances(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_instance_id, coach_id)
);

-- Indexes
CREATE INDEX idx_lesson_instance_coaches_org_id ON lesson_instance_coaches(org_id);
CREATE INDEX idx_lesson_instance_coaches_lesson_instance_id ON lesson_instance_coaches(lesson_instance_id);
CREATE INDEX idx_lesson_instance_coaches_coach_id ON lesson_instance_coaches(coach_id);

-- RLS
ALTER TABLE lesson_instance_coaches ENABLE ROW LEVEL SECURITY;

-- All org users can read
CREATE POLICY "lesson_instance_coaches_select"
  ON lesson_instance_coaches FOR SELECT
  USING (lesson_instance_coaches.org_id = get_user_org_id());

-- Owner/admin can manage
CREATE POLICY "lesson_instance_coaches_insert"
  ON lesson_instance_coaches FOR INSERT
  WITH CHECK (
    lesson_instance_coaches.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "lesson_instance_coaches_delete"
  ON lesson_instance_coaches FOR DELETE
  USING (
    lesson_instance_coaches.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );
