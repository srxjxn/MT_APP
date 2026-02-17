-- ============================================================
-- Modern Tennis: Initial Schema
-- ============================================================

-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'coach', 'parent');
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
CREATE TYPE court_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE lesson_type AS ENUM ('group', 'private', 'semi_private', 'camp');
CREATE TYPE lesson_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE enrollment_status AS ENUM ('enrolled', 'waitlisted', 'dropped', 'completed');
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'expired');
CREATE TYPE payment_type AS ENUM ('lesson', 'subscription', 'drop_in', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_platform AS ENUM ('stripe', 'square', 'cash', 'check', 'other');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');

-- ============================================================
-- Trigger function for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Organizations (created first, owner_id added later)
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'parent',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Now add owner_id FK to organizations
ALTER TABLE organizations ADD COLUMN owner_id UUID REFERENCES users(id);

-- ============================================================
-- Students
-- ============================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  skill_level skill_level NOT NULL DEFAULT 'beginner',
  avatar_url TEXT,
  medical_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_org_id ON students(org_id);
CREATE INDEX idx_students_parent_id ON students(parent_id);

CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Courts
-- ============================================================
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  surface_type TEXT NOT NULL,
  is_indoor BOOLEAN NOT NULL DEFAULT FALSE,
  status court_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courts_org_id ON courts(org_id);

CREATE TRIGGER set_courts_updated_at
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Lesson Templates
-- ============================================================
CREATE TABLE lesson_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  lesson_type lesson_type NOT NULL DEFAULT 'group',
  max_students INTEGER NOT NULL DEFAULT 6,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_cents INTEGER NOT NULL DEFAULT 0,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_templates_org_id ON lesson_templates(org_id);
CREATE INDEX idx_lesson_templates_coach_id ON lesson_templates(coach_id);
CREATE INDEX idx_lesson_templates_court_id ON lesson_templates(court_id);

CREATE TRIGGER set_lesson_templates_updated_at
  BEFORE UPDATE ON lesson_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Lesson Instances
-- ============================================================
CREATE TABLE lesson_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES lesson_templates(id) ON DELETE SET NULL,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status lesson_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_instances_org_id ON lesson_instances(org_id);
CREATE INDEX idx_lesson_instances_template_id ON lesson_instances(template_id);
CREATE INDEX idx_lesson_instances_coach_id ON lesson_instances(coach_id);
CREATE INDEX idx_lesson_instances_court_id ON lesson_instances(court_id);
CREATE INDEX idx_lesson_instances_date ON lesson_instances(date);

CREATE TRIGGER set_lesson_instances_updated_at
  BEFORE UPDATE ON lesson_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Coach Availability
-- ============================================================
CREATE TABLE coach_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
  specific_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coach_availability_org_id ON coach_availability(org_id);
CREATE INDEX idx_coach_availability_coach_id ON coach_availability(coach_id);

CREATE TRIGGER set_coach_availability_updated_at
  BEFORE UPDATE ON coach_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Enrollments
-- ============================================================
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lesson_instance_id UUID NOT NULL REFERENCES lesson_instances(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'enrolled',
  attended BOOLEAN,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_instance_id, student_id)
);

CREATE INDEX idx_enrollments_org_id ON enrollments(org_id);
CREATE INDEX idx_enrollments_lesson_instance_id ON enrollments(lesson_instance_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);

CREATE TRIGGER set_enrollments_updated_at
  BEFORE UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Student Notes
-- ============================================================
CREATE TABLE student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_instance_id UUID REFERENCES lesson_instances(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_notes_org_id ON student_notes(org_id);
CREATE INDEX idx_student_notes_student_id ON student_notes(student_id);
CREATE INDEX idx_student_notes_author_id ON student_notes(author_id);

CREATE TRIGGER set_student_notes_updated_at
  BEFORE UPDATE ON student_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Subscriptions
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  lessons_per_month INTEGER,
  status subscription_status NOT NULL DEFAULT 'active',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Payments
-- ============================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  payment_type payment_type NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_platform payment_platform,
  external_id TEXT,
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'push',
  status notification_status NOT NULL DEFAULT 'pending',
  data JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_org_id ON notifications(org_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
