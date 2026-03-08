-- Sync development database schema to match server/migrations/database.sql
-- Source of truth: database.sql
-- Generated: 2026-03-06

BEGIN;

-- Ensure required extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------
-- 1) Missing table in dev DB
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_question_assignments (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES public.books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, user_id, question_id)
);

-- ------------------------------------------------------------------
-- 2) Column/default/nullability alignment
-- ------------------------------------------------------------------
-- users.role default should be 'user'
ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'user';

-- books.owner_id is nullable in database.sql
ALTER TABLE public.books
  ALTER COLUMN owner_id DROP NOT NULL;

-- books defaults from database.sql
ALTER TABLE public.books
  ALTER COLUMN page_size SET DEFAULT 'A4',
  ALTER COLUMN orientation SET DEFAULT 'portrait';

-- pages differences
ALTER TABLE public.pages
  ALTER COLUMN book_id DROP NOT NULL,
  ALTER COLUMN elements DROP NOT NULL;

-- pages.updated_at does not exist in database.sql
ALTER TABLE public.pages
  DROP COLUMN IF EXISTS updated_at;

-- images.s3_url exists in database.sql
ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS s3_url TEXT;

-- theme_page_backgrounds.background_image_id is NOT NULL in database.sql
-- Note: Only set NOT NULL if no NULL values exist; checked via post-sync verification
ALTER TABLE public.theme_page_backgrounds
  ALTER COLUMN background_image_id SET NOT NULL;

-- ------------------------------------------------------------------
-- 3) book_friends structure alignment
-- ------------------------------------------------------------------
-- Target table in database.sql has:
--   id SERIAL PRIMARY KEY,
--   UNIQUE(book_id, user_id),
--   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
--   book_role default 'author'

CREATE SEQUENCE IF NOT EXISTS public.book_friends_id_seq;

ALTER TABLE public.book_friends
  ADD COLUMN IF NOT EXISTS id INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.book_friends
  ALTER COLUMN id SET DEFAULT nextval('public.book_friends_id_seq'::regclass);

UPDATE public.book_friends
SET id = nextval('public.book_friends_id_seq'::regclass)
WHERE id IS NULL;

SELECT setval(
  'public.book_friends_id_seq'::regclass,
  COALESCE((SELECT MAX(id) FROM public.book_friends), 1),
  true
);

ALTER TABLE public.book_friends
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN book_role SET DEFAULT 'author';

ALTER TABLE public.book_friends
  DROP CONSTRAINT IF EXISTS book_collaborators_pkey,
  DROP CONSTRAINT IF EXISTS book_friends_pkey;

ALTER TABLE public.book_friends
  ADD CONSTRAINT book_friends_pkey PRIMARY KEY (id);

ALTER TABLE public.book_friends
  DROP CONSTRAINT IF EXISTS book_friends_book_id_user_id_key,
  DROP CONSTRAINT IF EXISTS book_collaborators_book_id_user_id_key;

ALTER TABLE public.book_friends
  ADD CONSTRAINT book_friends_book_id_user_id_key UNIQUE (book_id, user_id);

-- ------------------------------------------------------------------
-- 4) Index alignment
-- ------------------------------------------------------------------
-- Missing indexes from database.sql
CREATE INDEX IF NOT EXISTS idx_books_owner_id ON public.books(owner_id);
CREATE INDEX IF NOT EXISTS idx_pages_book_id ON public.pages(book_id);
CREATE INDEX IF NOT EXISTS idx_book_friends_book_id ON public.book_friends(book_id);
CREATE INDEX IF NOT EXISTS idx_book_friends_user_id ON public.book_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_images_book_id ON public.images(book_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON public.images(uploaded_by);

-- Rename index names to match database.sql naming
ALTER INDEX IF EXISTS public.idx_question_pool_category RENAME TO idx_question_pools_category;
ALTER INDEX IF EXISTS public.idx_question_pool_is_active RENAME TO idx_question_pools_is_active;
ALTER INDEX IF EXISTS public.idx_sandbox_page_user_id RENAME TO idx_sandbox_pages_user_id;
ALTER INDEX IF EXISTS public.idx_sandbox_page_updated_at RENAME TO idx_sandbox_pages_updated_at;

-- Remove schema objects that are not in database.sql
DROP INDEX IF EXISTS public.idx_friendships_user_id;
DROP INDEX IF EXISTS public.idx_friendships_friend_id;
DROP INDEX IF EXISTS public.idx_pages_theme_id;
DROP INDEX IF EXISTS public.idx_pages_layout_id;
DROP INDEX IF EXISTS public.idx_pages_color_palette_id;

-- ------------------------------------------------------------------
-- 5) Trigger/function alignment
-- ------------------------------------------------------------------
-- Keep only update_answers_updated_at() from database.sql
-- (Already exists in dev DB, so no CREATE needed)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;

DROP FUNCTION IF EXISTS public.update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS public.update_conversations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_messages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_questions_updated_at() CASCADE;

-- ------------------------------------------------------------------
-- 6) Constraints not present in database.sql
-- ------------------------------------------------------------------
ALTER TABLE public.friendships
  DROP CONSTRAINT IF EXISTS chk_friendships_user_id_lt_friend_id;

COMMIT;
