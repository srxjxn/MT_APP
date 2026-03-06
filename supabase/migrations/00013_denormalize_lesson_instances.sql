-- Denormalize key fields from lesson_templates onto lesson_instances
-- so that ad-hoc lessons (template_id = NULL) are fully self-contained.

ALTER TABLE lesson_instances
  ADD COLUMN name TEXT,
  ADD COLUMN lesson_type lesson_type,
  ADD COLUMN duration_minutes INTEGER,
  ADD COLUMN max_students INTEGER,
  ADD COLUMN price_cents INTEGER,
  ADD COLUMN description TEXT;

-- Backfill from linked templates
UPDATE lesson_instances li
SET
  name = lt.name,
  lesson_type = lt.lesson_type,
  duration_minutes = lt.duration_minutes,
  max_students = lt.max_students,
  price_cents = lt.price_cents,
  description = lt.description
FROM lesson_templates lt
WHERE li.template_id = lt.id;

-- Default orphans (instances with no template)
UPDATE lesson_instances SET
  name = COALESCE(name, 'Ad-hoc Lesson'),
  lesson_type = COALESCE(lesson_type, 'group'),
  duration_minutes = COALESCE(duration_minutes, 60),
  max_students = COALESCE(max_students, 6),
  price_cents = COALESCE(price_cents, 0)
WHERE name IS NULL;

-- Make NOT NULL with defaults
ALTER TABLE lesson_instances
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN name SET DEFAULT 'Lesson',
  ALTER COLUMN lesson_type SET NOT NULL,
  ALTER COLUMN lesson_type SET DEFAULT 'group',
  ALTER COLUMN duration_minutes SET NOT NULL,
  ALTER COLUMN duration_minutes SET DEFAULT 60,
  ALTER COLUMN max_students SET NOT NULL,
  ALTER COLUMN max_students SET DEFAULT 6,
  ALTER COLUMN price_cents SET NOT NULL,
  ALTER COLUMN price_cents SET DEFAULT 0;
