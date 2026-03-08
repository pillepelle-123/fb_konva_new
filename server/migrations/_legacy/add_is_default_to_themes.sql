-- Ensure theme id=1 (Default) has is_default=true for the design wizard fallback
ALTER TABLE themes ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
UPDATE themes SET is_default = true WHERE id = 1;
