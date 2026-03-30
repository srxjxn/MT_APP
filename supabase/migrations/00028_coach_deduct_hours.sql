-- Allow coaches to update hours_used and status on student_packages
-- tied to their own coach_packages (for auto-deduction on lesson completion)
CREATE POLICY "Coaches can update hours on own packages"
ON student_packages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM coach_packages cp
    WHERE cp.id = student_packages.coach_package_id
    AND cp.coach_id = get_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM coach_packages cp
    WHERE cp.id = student_packages.coach_package_id
    AND cp.coach_id = get_user_id()
  )
);
