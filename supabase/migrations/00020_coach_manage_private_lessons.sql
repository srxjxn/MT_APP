-- Coach can INSERT lesson_templates (private/semi_private only, own lessons)
CREATE POLICY "coach_insert_own_lesson_templates"
  ON lesson_templates FOR INSERT
  WITH CHECK (
    lesson_templates.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_templates.coach_id = get_user_id()
    AND lesson_templates.lesson_type IN ('private', 'semi_private')
  );

-- Coach can UPDATE own lesson_templates
CREATE POLICY "coach_update_own_lesson_templates"
  ON lesson_templates FOR UPDATE
  USING (
    lesson_templates.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_templates.coach_id = get_user_id()
  );

-- Coach can DELETE own lesson_templates
CREATE POLICY "coach_delete_own_lesson_templates"
  ON lesson_templates FOR DELETE
  USING (
    lesson_templates.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_templates.coach_id = get_user_id()
  );

-- Coach can INSERT lesson_instances (private/semi_private only, own lessons)
CREATE POLICY "coach_insert_own_lesson_instances"
  ON lesson_instances FOR INSERT
  WITH CHECK (
    lesson_instances.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND lesson_instances.coach_id = get_user_id()
    AND lesson_instances.lesson_type IN ('private', 'semi_private')
  );

-- Coach can INSERT enrollments for their own lessons
CREATE POLICY "coach_insert_enrollment_own_lessons"
  ON enrollments FOR INSERT
  WITH CHECK (
    enrollments.org_id = get_user_org_id()
    AND get_user_role() = 'coach'
    AND EXISTS (
      SELECT 1 FROM lesson_instances li
      WHERE li.id = enrollments.lesson_instance_id
      AND li.coach_id = get_user_id()
    )
  );
