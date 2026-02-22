-- ============================================================
-- Phase 7: Dashboard + Students + Courts Enhancements
-- ============================================================

-- Add group rate for coaches (drop_in_rate_cents stays as private rate)
ALTER TABLE users ADD COLUMN group_rate_cents INTEGER;
