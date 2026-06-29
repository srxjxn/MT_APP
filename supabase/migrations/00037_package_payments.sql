-- Make private-lesson packages a tracked payment type and link payments to a package.
-- Additive + mobile-safe: mobile never emits 'package' and ignores the new nullable column.
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'package';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS student_package_id uuid REFERENCES student_packages(id);
