-- Migration: get_payroll_period RPC for the web back-office payroll dashboard.
-- ADDITIVE ONLY — creates one function. No tables/columns/RLS changed.
-- Returns one row per coach with >=1 completed lesson in [p_start, p_end].
--
-- Multi-coach correctness: a coach is credited for a completed lesson if they are
-- the lead lesson_instances.coach_id OR appear in lesson_instance_coaches for that
-- instance. Deduped by (lesson_instance_id, coach_id) via UNION so a coach who is
-- both lead and additional on one lesson is counted once, full duration each.
--
-- Consumed ONLY by the web app. The mobile app's useCoachWorkLog is unchanged and
-- still computes lead-coach-only hours, so mobile behavior is unaffected.
--
-- SECURITY DEFINER: enforces org + owner/admin authorization manually (it aggregates
-- across all coaches in the org, which RLS would otherwise restrict). All column
-- references are table-qualified per the Realtime "ambiguous column" rule in CLAUDE.md.

CREATE OR REPLACE FUNCTION get_payroll_period(
  p_org_id UUID,
  p_start DATE,
  p_end DATE
)
RETURNS TABLE (
  coach_id UUID,
  first_name TEXT,
  last_name TEXT,
  group_hours NUMERIC,
  private_hours NUMERIC,
  group_rate_cents INTEGER,
  private_rate_cents INTEGER,
  lesson_count BIGINT,
  existing_payout_id UUID,
  existing_payout_status payout_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: caller must be an owner/admin of the requested org.
  IF p_org_id <> get_user_org_id() OR get_user_role() NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'not authorized for org %', p_org_id;
  END IF;

  RETURN QUERY
  WITH credited AS (
    -- Lead coach on the completed lesson
    SELECT
      lesson_instances.id AS lesson_instance_id,
      lesson_instances.coach_id AS coach_id,
      lesson_instances.lesson_type AS lesson_type,
      lesson_instances.duration_minutes AS duration_minutes
    FROM lesson_instances
    WHERE lesson_instances.org_id = p_org_id
      AND lesson_instances.status = 'completed'
      AND lesson_instances.date BETWEEN p_start AND p_end
    UNION
    -- Additional coaches on the same completed lesson
    SELECT
      lesson_instances.id AS lesson_instance_id,
      lesson_instance_coaches.coach_id AS coach_id,
      lesson_instances.lesson_type AS lesson_type,
      lesson_instances.duration_minutes AS duration_minutes
    FROM lesson_instances
    JOIN lesson_instance_coaches
      ON lesson_instance_coaches.lesson_instance_id = lesson_instances.id
    WHERE lesson_instances.org_id = p_org_id
      AND lesson_instances.status = 'completed'
      AND lesson_instances.date BETWEEN p_start AND p_end
  ),
  agg AS (
    SELECT
      credited.coach_id AS coach_id,
      ROUND(SUM(CASE WHEN credited.lesson_type = 'group' THEN credited.duration_minutes ELSE 0 END)::NUMERIC / 60, 2) AS group_hours,
      ROUND(SUM(CASE WHEN credited.lesson_type <> 'group' THEN credited.duration_minutes ELSE 0 END)::NUMERIC / 60, 2) AS private_hours,
      COUNT(*) AS lesson_count
    FROM credited
    GROUP BY credited.coach_id
  )
  SELECT
    agg.coach_id,
    users.first_name,
    users.last_name,
    agg.group_hours,
    agg.private_hours,
    users.group_rate_cents,
    users.drop_in_rate_cents AS private_rate_cents,
    agg.lesson_count,
    existing.id AS existing_payout_id,
    existing.status AS existing_payout_status
  FROM agg
  JOIN users ON users.id = agg.coach_id
  LEFT JOIN LATERAL (
    SELECT coach_payouts.id, coach_payouts.status
    FROM coach_payouts
    WHERE coach_payouts.coach_id = agg.coach_id
      AND coach_payouts.org_id = p_org_id
      AND coach_payouts.period_start = p_start
      AND coach_payouts.period_end = p_end
    ORDER BY coach_payouts.created_at DESC
    LIMIT 1
  ) existing ON TRUE
  ORDER BY users.first_name, users.last_name;
END;
$$;
