-- Allow coaches to delete their own scheduled private/semi-private lesson instances
CREATE POLICY "coach_delete_own_lesson_instances"
  ON lesson_instances FOR DELETE
  USING (
    lesson_instances.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_instances.coach_id = get_user_id()
    AND lesson_instances.lesson_type IN ('private', 'semi_private')
    AND lesson_instances.status = 'scheduled'
  );
