SET search_path TO public;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS group_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE;







