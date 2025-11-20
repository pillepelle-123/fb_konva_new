SET search_path TO public;

-- Extend conversations table for book-specific group chats
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES public.books(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_book_id_unique'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_book_id_unique UNIQUE (book_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_conversations_book_id
  ON public.conversations(book_id);

CREATE INDEX IF NOT EXISTS idx_conversations_active
  ON public.conversations(active);

CREATE INDEX IF NOT EXISTS idx_conversations_is_group
  ON public.conversations(is_group);







