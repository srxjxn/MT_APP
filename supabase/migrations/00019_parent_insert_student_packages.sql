-- Allow parents to insert student_packages for their own students
CREATE POLICY "student_packages_insert_parent"
  ON student_packages FOR INSERT
  WITH CHECK (
    student_packages.org_id = get_user_org_id()
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = student_packages.student_id
      AND s.parent_id = get_user_id()
    )
  );
