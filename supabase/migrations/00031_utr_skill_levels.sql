-- Migration: Replace skill_level enum values with UTR-based categories
-- beginner/intermediate → under_4_utr, advanced/elite → over_4_utr

-- 1. Create new enum type
CREATE TYPE skill_level_new AS ENUM ('under_4_utr', 'over_4_utr');

-- 2. Alter students.skill_level column: map old values → new values
ALTER TABLE students
  ALTER COLUMN skill_level DROP DEFAULT;

ALTER TABLE students
  ALTER COLUMN skill_level TYPE skill_level_new
  USING CASE
    WHEN skill_level::text IN ('beginner', 'intermediate') THEN 'under_4_utr'::skill_level_new
    WHEN skill_level::text IN ('advanced', 'elite') THEN 'over_4_utr'::skill_level_new
    ELSE 'under_4_utr'::skill_level_new
  END;

ALTER TABLE students
  ALTER COLUMN skill_level SET DEFAULT 'under_4_utr'::skill_level_new;

-- 3. Drop old enum and rename new one
DROP TYPE skill_level;
ALTER TYPE skill_level_new RENAME TO skill_level;
