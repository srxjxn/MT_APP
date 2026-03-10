-- Trigger: when a student's assigned_coach_id changes, sync to the parent's users.assigned_coach_id
-- This ensures parents can see private lesson packages in billing without manual admin intervention.

CREATE OR REPLACE FUNCTION sync_parent_assigned_coach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_id UUID;
  v_fallback_coach_id UUID;
BEGIN
  -- Get the parent of the student being updated
  v_parent_id := COALESCE(NEW.parent_id, OLD.parent_id);

  IF v_parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' OR NEW.assigned_coach_id IS NULL THEN
    -- Coach was unassigned: fall back to another child's coach, or null
    SELECT s.assigned_coach_id INTO v_fallback_coach_id
    FROM students s
    WHERE s.parent_id = v_parent_id
      AND s.assigned_coach_id IS NOT NULL
      AND s.id IS DISTINCT FROM OLD.id
    LIMIT 1;

    UPDATE users
    SET assigned_coach_id = v_fallback_coach_id
    WHERE users.id = v_parent_id;
  ELSE
    -- Coach was assigned: set on parent
    UPDATE users
    SET assigned_coach_id = NEW.assigned_coach_id
    WHERE users.id = v_parent_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_parent_assigned_coach
  AFTER INSERT OR UPDATE OF assigned_coach_id OR DELETE
  ON students
  FOR EACH ROW
  EXECUTE FUNCTION sync_parent_assigned_coach();

-- Backfill: for parents who have students with an assigned coach but no assigned_coach_id on their user record
UPDATE users
SET assigned_coach_id = sub.coach_id
FROM (
  SELECT DISTINCT ON (s.parent_id) s.parent_id, s.assigned_coach_id AS coach_id
  FROM students s
  WHERE s.assigned_coach_id IS NOT NULL
  ORDER BY s.parent_id, s.updated_at DESC
) sub
WHERE users.id = sub.parent_id
  AND users.assigned_coach_id IS NULL;
