-- Atomic manual deduction RPC for cases without a lesson_instance_id.
-- Uses server-side arithmetic to avoid read-then-write race conditions.
-- Unlike deduct_package_hours, this has no UNIQUE constraint protection
-- (no lesson instance to key on), so callers must guard against misuse.
CREATE OR REPLACE FUNCTION deduct_package_hours_manual(p_package_id UUID, p_hours NUMERIC) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ DECLARE v_pkg RECORD; BEGIN UPDATE student_packages SET hours_used = hours_used + p_hours, status = CASE WHEN hours_used + p_hours >= hours_purchased THEN 'exhausted'::package_status ELSE 'active'::package_status END WHERE id = p_package_id RETURNING * INTO v_pkg; IF v_pkg IS NULL THEN RAISE EXCEPTION 'Package not found: %', p_package_id; END IF; RETURN to_jsonb(v_pkg); END; $$;
