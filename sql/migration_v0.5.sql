-- ============================================================
-- HORIVOO — Migration v0.5
-- Students table updates: email nullable, phone required,
-- add responsible_name and notes columns
-- ============================================================

-- Add new columns to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS responsible_name TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Make email nullable
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;

-- Make phone required (set default first, then add constraint)
ALTER TABLE students ALTER COLUMN phone SET DEFAULT '';
UPDATE students SET phone = '' WHERE phone IS NULL;
