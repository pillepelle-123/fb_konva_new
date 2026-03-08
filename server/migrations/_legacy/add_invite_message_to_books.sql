SET search_path TO public;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS invite_message TEXT;


