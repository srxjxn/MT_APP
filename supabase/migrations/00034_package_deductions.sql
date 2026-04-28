-- ============================================================
-- Package Deductions Ledger + Atomic Deduction RPC
-- Prevents double-deduction by recording each deduction with a
-- UNIQUE constraint on (student_package_id, lesson_instance_id).
-- ============================================================

CREATE TABLE package_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_package_id UUID NOT NULL REFERENCES student_packages(id) ON DELETE CASCADE,
  lesson_instance_id UUID NOT NULL REFERENCES lesson_instances(id) ON DELETE CASCADE,
  hours_deducted NUMERIC(5,2) NOT NULL CHECK (hours_deducted > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_package_id, lesson_instance_id)
);

CREATE INDEX idx_package_deductions_package ON package_deductions(student_package_id);
CREATE INDEX idx_package_deductions_instance ON package_deductions(lesson_instance_id);

-- ============================================================
-- RLS (mirrors student_packages policies)
-- ============================================================
ALTER TABLE package_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "package_deductions_select_admin" ON package_deductions FOR SELECT USING (EXISTS (SELECT 1 FROM student_packages sp WHERE sp.id = package_deductions.student_package_id AND sp.org_id = get_user_org_id()) AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "package_deductions_select_coach" ON package_deductions FOR SELECT USING (EXISTS (SELECT 1 FROM student_packages sp JOIN coach_packages cp ON cp.id = sp.coach_package_id WHERE sp.id = package_deductions.student_package_id AND cp.coach_id = get_user_id()) AND get_user_role() = 'coach');

CREATE POLICY "package_deductions_select_parent" ON package_deductions FOR SELECT USING (EXISTS (SELECT 1 FROM student_packages sp JOIN students s ON s.id = sp.student_id WHERE sp.id = package_deductions.student_package_id AND s.parent_id = get_user_id()) AND get_user_role() = 'parent');

CREATE POLICY "package_deductions_insert_admin" ON package_deductions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM student_packages sp WHERE sp.id = package_deductions.student_package_id AND sp.org_id = get_user_org_id()) AND get_user_role() IN ('owner', 'admin'));

CREATE POLICY "package_deductions_insert_coach" ON package_deductions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM student_packages sp JOIN coach_packages cp ON cp.id = sp.coach_package_id WHERE sp.id = package_deductions.student_package_id AND cp.coach_id = get_user_id()) AND get_user_role() = 'coach');

-- ============================================================
-- Atomic deduction RPC — single transaction, no race conditions
-- Returns the updated package row, or NULL if already deducted
-- for this lesson (unique violation caught gracefully).
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_package_hours(p_package_id UUID, p_hours NUMERIC, p_lesson_instance_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pkg RECORD;
  v_new_hours NUMERIC;
  v_is_exhausted BOOLEAN;
BEGIN
  -- 1. Insert deduction record (unique constraint prevents duplicates)
  BEGIN
    INSERT INTO package_deductions (student_package_id, lesson_instance_id, hours_deducted)
    VALUES (p_package_id, p_lesson_instance_id, p_hours);
  EXCEPTION WHEN unique_violation THEN
    -- Already deducted for this lesson — return null
    RETURN NULL;
  END;

  -- 2. Atomically update hours_used
  UPDATE student_packages
  SET hours_used = hours_used + p_hours,
      status = CASE WHEN hours_used + p_hours >= hours_purchased THEN 'exhausted'::package_status ELSE 'active'::package_status END
  WHERE id = p_package_id
  RETURNING * INTO v_pkg;

  IF v_pkg IS NULL THEN
    RAISE EXCEPTION 'Package not found: %', p_package_id;
  END IF;

  RETURN to_jsonb(v_pkg);
END;
$$;
