-- Migration: Add skill_level (UTR category) to lesson_templates and lesson_instances
-- Allows lessons to be tagged with a UTR category for auto-enrollment of matching students.
-- Nullable: lessons without a UTR category remain valid.

ALTER TABLE lesson_templates ADD COLUMN skill_level skill_level;
ALTER TABLE lesson_instances ADD COLUMN skill_level skill_level;
