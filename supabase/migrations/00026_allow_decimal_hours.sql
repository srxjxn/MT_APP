-- Allow half-hour increments in package hours
ALTER TABLE student_packages
  ALTER COLUMN hours_purchased TYPE NUMERIC(5,2);

ALTER TABLE coach_packages
  ALTER COLUMN num_hours TYPE NUMERIC(5,2);
