-- ============================================================
-- RLS Policies
-- ============================================================

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Organizations
-- ============================================================
CREATE POLICY "Users can view their own org"
  ON organizations FOR SELECT
  USING (organizations.id = get_user_org_id());

CREATE POLICY "Owner/Admin can update their org"
  ON organizations FOR UPDATE
  USING (organizations.id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

-- ============================================================
-- Users
-- ============================================================
CREATE POLICY "Users can view users in their org"
  ON users FOR SELECT
  USING (users.org_id = get_user_org_id());

CREATE POLICY "Users can insert themselves during registration"
  ON users FOR INSERT
  WITH CHECK (users.auth_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (users.auth_id = auth.uid());

CREATE POLICY "Owner/Admin can update any user in org"
  ON users FOR UPDATE
  USING (users.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Owner/Admin can delete users in org"
  ON users FOR DELETE
  USING (users.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

-- ============================================================
-- Students
-- ============================================================
CREATE POLICY "Owner/Admin can do everything with students"
  ON students FOR ALL
  USING (students.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Coach can view students in their org"
  ON students FOR SELECT
  USING (students.org_id = get_user_org_id() AND get_user_role() = 'coach');

CREATE POLICY "Parent can view their own students"
  ON students FOR SELECT
  USING (students.parent_id = get_user_id());

CREATE POLICY "Parent can insert their own students"
  ON students FOR INSERT
  WITH CHECK (students.parent_id = get_user_id());

CREATE POLICY "Parent can update their own students"
  ON students FOR UPDATE
  USING (students.parent_id = get_user_id());

-- ============================================================
-- Courts
-- ============================================================
CREATE POLICY "Users in org can view courts"
  ON courts FOR SELECT
  USING (courts.org_id = get_user_org_id());

CREATE POLICY "Owner/Admin can manage courts"
  ON courts FOR ALL
  USING (courts.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

-- ============================================================
-- Lesson Templates
-- ============================================================
CREATE POLICY "Users in org can view lesson templates"
  ON lesson_templates FOR SELECT
  USING (lesson_templates.org_id = get_user_org_id());

CREATE POLICY "Owner/Admin can manage lesson templates"
  ON lesson_templates FOR ALL
  USING (lesson_templates.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

-- ============================================================
-- Lesson Instances
-- ============================================================
CREATE POLICY "Users in org can view lesson instances"
  ON lesson_instances FOR SELECT
  USING (lesson_instances.org_id = get_user_org_id());

CREATE POLICY "Owner/Admin can manage lesson instances"
  ON lesson_instances FOR ALL
  USING (lesson_instances.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Coach can update their own lesson instances"
  ON lesson_instances FOR UPDATE
  USING (lesson_instances.coach_id = get_user_id() AND get_user_role() = 'coach');

-- ============================================================
-- Coach Availability
-- ============================================================
CREATE POLICY "Users in org can view coach availability"
  ON coach_availability FOR SELECT
  USING (coach_availability.org_id = get_user_org_id());

CREATE POLICY "Owner/Admin can manage coach availability"
  ON coach_availability FOR ALL
  USING (coach_availability.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Coach can manage their own availability"
  ON coach_availability FOR ALL
  USING (coach_availability.coach_id = get_user_id() AND get_user_role() = 'coach');

-- ============================================================
-- Enrollments
-- ============================================================
CREATE POLICY "Owner/Admin can manage enrollments"
  ON enrollments FOR ALL
  USING (enrollments.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Coach can view enrollments for their lessons"
  ON enrollments FOR SELECT
  USING (
    enrollments.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND enrollments.lesson_instance_id IN (
      SELECT lesson_instances.id FROM lesson_instances WHERE lesson_instances.coach_id = get_user_id()
    )
  );

CREATE POLICY "Coach can update enrollment attendance"
  ON enrollments FOR UPDATE
  USING (
    enrollments.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND enrollments.lesson_instance_id IN (
      SELECT lesson_instances.id FROM lesson_instances WHERE lesson_instances.coach_id = get_user_id()
    )
  );

CREATE POLICY "Parent can view their children enrollments"
  ON enrollments FOR SELECT
  USING (
    enrollments.student_id IN (SELECT students.id FROM students WHERE students.parent_id = get_user_id())
  );

CREATE POLICY "Parent can insert enrollments for their children"
  ON enrollments FOR INSERT
  WITH CHECK (
    enrollments.student_id IN (SELECT students.id FROM students WHERE students.parent_id = get_user_id())
  );

-- ============================================================
-- Student Notes
-- ============================================================
CREATE POLICY "Owner/Admin can manage student notes"
  ON student_notes FOR ALL
  USING (student_notes.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Coach can view and create student notes"
  ON student_notes FOR SELECT
  USING (student_notes.org_id = get_user_org_id() AND get_user_role() = 'coach');

CREATE POLICY "Coach can insert student notes"
  ON student_notes FOR INSERT
  WITH CHECK (student_notes.author_id = get_user_id() AND get_user_role() = 'coach');

CREATE POLICY "Parent can view non-private notes for their children"
  ON student_notes FOR SELECT
  USING (
    student_notes.is_private = FALSE
    AND student_notes.student_id IN (SELECT students.id FROM students WHERE students.parent_id = get_user_id())
  );

-- ============================================================
-- Subscriptions
-- ============================================================
CREATE POLICY "Owner/Admin can manage subscriptions"
  ON subscriptions FOR ALL
  USING (subscriptions.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (subscriptions.user_id = get_user_id());

-- ============================================================
-- Payments
-- ============================================================
CREATE POLICY "Owner/Admin can manage payments"
  ON payments FOR ALL
  USING (payments.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (payments.user_id = get_user_id());

-- ============================================================
-- Notifications
-- ============================================================
CREATE POLICY "Owner/Admin can manage notifications"
  ON notifications FOR ALL
  USING (notifications.org_id = get_user_org_id() AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (notifications.user_id = get_user_id());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (notifications.user_id = get_user_id());
