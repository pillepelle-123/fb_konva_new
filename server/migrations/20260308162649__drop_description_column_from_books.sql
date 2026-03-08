BEGIN;

-- Drop description column from books table
-- This was added in 20260308161244 for testing purposes
ALTER TABLE public.books DROP COLUMN IF EXISTS description;

COMMIT;
