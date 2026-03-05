-- Add payment_id to lesson_requests to link private lesson payments
ALTER TABLE lesson_requests
  ADD COLUMN payment_id UUID REFERENCES payments(id);

-- RLS: allow parent to read their own lesson_requests payment_id
-- (existing RLS policies already cover SELECT on lesson_requests)
