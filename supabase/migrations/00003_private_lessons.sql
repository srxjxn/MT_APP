-- ============================================================
-- Phase 6: Private Lessons — Coach Pricing, Student Packages, Lesson Requests
-- ============================================================

-- New enums
CREATE TYPE package_status AS ENUM ('active', 'exhausted', 'expired', 'cancelled');
CREATE TYPE lesson_request_status AS ENUM ('pending', 'approved', 'declined', 'cancelled');

-- Add drop-in rate to users (only coaches use it)
ALTER TABLE users ADD COLUMN drop_in_rate_cents INTEGER;

-- ============================================================
-- Coach Packages
-- ============================================================
CREATE TABLE coach_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  num_hours INTEGER NOT NULL CHECK (num_hours > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coach_packages_org_id ON coach_packages(org_id);
CREATE INDEX idx_coach_packages_coach_id ON coach_packages(coach_id);

CREATE TRIGGER set_coach_packages_updated_at
  BEFORE UPDATE ON coach_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Student Packages
-- ============================================================
CREATE TABLE student_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_package_id UUID NOT NULL REFERENCES coach_packages(id) ON DELETE CASCADE,
  hours_purchased INTEGER NOT NULL CHECK (hours_purchased > 0),
  hours_used NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (hours_used >= 0),
  status package_status NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_packages_org_id ON student_packages(org_id);
CREATE INDEX idx_student_packages_student_id ON student_packages(student_id);
CREATE INDEX idx_student_packages_status ON student_packages(status);

CREATE TRIGGER set_student_packages_updated_at
  BEFORE UPDATE ON student_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Lesson Requests
-- ============================================================
CREATE TABLE lesson_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_date DATE NOT NULL,
  preferred_time TIME NOT NULL,
  status lesson_request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  lesson_instance_id UUID REFERENCES lesson_instances(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_requests_org_id ON lesson_requests(org_id);
CREATE INDEX idx_lesson_requests_student_id ON lesson_requests(student_id);
CREATE INDEX idx_lesson_requests_coach_id ON lesson_requests(coach_id);
CREATE INDEX idx_lesson_requests_status ON lesson_requests(status);

CREATE TRIGGER set_lesson_requests_updated_at
  BEFORE UPDATE ON lesson_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS Policies (all column refs table-qualified per project convention)
-- ============================================================

ALTER TABLE coach_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_requests ENABLE ROW LEVEL SECURITY;

-- coach_packages: org users can SELECT; owner/admin can ALL
CREATE POLICY "coach_packages_select_org"
  ON coach_packages FOR SELECT
  USING (coach_packages.org_id = get_user_org_id());

CREATE POLICY "coach_packages_insert_admin"
  ON coach_packages FOR INSERT
  WITH CHECK (
    coach_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "coach_packages_update_admin"
  ON coach_packages FOR UPDATE
  USING (
    coach_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "coach_packages_delete_admin"
  ON coach_packages FOR DELETE
  USING (
    coach_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- student_packages: owner/admin ALL; coach SELECT own students; parent SELECT own children
CREATE POLICY "student_packages_select_admin"
  ON student_packages FOR SELECT
  USING (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "student_packages_select_coach"
  ON student_packages FOR SELECT
  USING (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND EXISTS (
      SELECT 1 FROM coach_packages cp
      WHERE cp.id = student_packages.coach_package_id
      AND cp.coach_id = get_user_id()
    )
  );

CREATE POLICY "student_packages_select_parent"
  ON student_packages FOR SELECT
  USING (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_packages.student_id
      AND s.parent_id = get_user_id()
    )
  );

CREATE POLICY "student_packages_insert_admin"
  ON student_packages FOR INSERT
  WITH CHECK (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "student_packages_update_admin"
  ON student_packages FOR UPDATE
  USING (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "student_packages_delete_admin"
  ON student_packages FOR DELETE
  USING (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

-- lesson_requests: owner/admin ALL; coach SELECT own; parent SELECT/INSERT/UPDATE own
CREATE POLICY "lesson_requests_select_admin"
  ON lesson_requests FOR SELECT
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "lesson_requests_select_coach"
  ON lesson_requests FOR SELECT
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_requests.coach_id = get_user_id()
  );

CREATE POLICY "lesson_requests_select_parent"
  ON lesson_requests FOR SELECT
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() = 'parent'
    AND lesson_requests.requested_by = get_user_id()
  );

CREATE POLICY "lesson_requests_insert_parent"
  ON lesson_requests FOR INSERT
  WITH CHECK (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() = 'parent'
    AND lesson_requests.requested_by = get_user_id()
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_requests.student_id
      AND s.parent_id = get_user_id()
    )
  );

CREATE POLICY "lesson_requests_insert_admin"
  ON lesson_requests FOR INSERT
  WITH CHECK (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "lesson_requests_update_parent"
  ON lesson_requests FOR UPDATE
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() = 'parent'
    AND lesson_requests.requested_by = get_user_id()
    AND lesson_requests.status = 'pending'
  );

CREATE POLICY "lesson_requests_update_admin"
  ON lesson_requests FOR UPDATE
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );

CREATE POLICY "lesson_requests_delete_admin"
  ON lesson_requests FOR DELETE
  USING (
    lesson_requests.org_id = get_user_org_id()
    AND get_user_role() IN ('owner', 'admin')
  );
