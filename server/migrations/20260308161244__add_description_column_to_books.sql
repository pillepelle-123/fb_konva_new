BEGIN;

-- Add description column to books table
-- Idempotent: IF NOT EXISTS prevents errors if re-run
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.books.description IS 'Long-form description of the book content';

COMMIT;
