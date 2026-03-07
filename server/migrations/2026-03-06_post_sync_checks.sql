-- Post-sync verification for dev DB
-- Expected target: server/migrations/database.sql
-- Run after: 2026-03-06_sync_dev_to_database_sql.sql

-- ================================================================
-- 1) Missing/unexpected tables
-- ================================================================
WITH expected_tables(table_name) AS (
  VALUES
    ('answers'),
    ('background_image_categories'),
    ('background_image_designs'),
    ('background_image_templates'),
    ('background_images'),
    ('book_friends'),
    ('books'),
    ('color_palettes'),
    ('conversation_invitations'),
    ('conversation_participant_settings'),
    ('conversation_participants'),
    ('conversations'),
    ('editor_settings'),
    ('friend_invitations'),
    ('friendships'),
    ('images'),
    ('layouts'),
    ('message_read_status'),
    ('messages'),
    ('page_assignments'),
    ('page_images'),
    ('pages'),
    ('pdf_exports'),
    ('question_pages'),
    ('question_pools'),
    ('questions'),
    ('sandbox_pages'),
    ('sticker_categories'),
    ('stickers'),
    ('theme_designer_backgrounds'),
    ('theme_page_backgrounds'),
    ('theme_template_backgrounds'),
    ('themes'),
    ('user_blocks'),
    ('user_question_assignments'),
    ('users')
),
actual_tables AS (
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
SELECT 'missing_table' AS issue, e.table_name AS object_name
FROM expected_tables e
LEFT JOIN actual_tables a USING (table_name)
WHERE a.table_name IS NULL
UNION ALL
SELECT 'unexpected_table' AS issue, a.table_name AS object_name
FROM actual_tables a
LEFT JOIN expected_tables e USING (table_name)
WHERE e.table_name IS NULL
ORDER BY issue, object_name;

-- ================================================================
-- 2) Critical column checks
-- ================================================================
SELECT
  table_name,
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'users' AND column_name = 'role') OR
    (table_name = 'books' AND column_name IN ('owner_id', 'page_size', 'orientation')) OR
    (table_name = 'pages' AND column_name IN ('book_id', 'elements', 'updated_at')) OR
    (table_name = 'images' AND column_name = 's3_url') OR
    (table_name = 'theme_page_backgrounds' AND column_name = 'background_image_id') OR
    (table_name = 'book_friends' AND column_name IN ('id', 'created_at', 'book_role'))
  )
ORDER BY table_name, column_name;

-- ================================================================
-- 3) book_friends keys/constraints check
-- ================================================================
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  pg_get_constraintdef(c.oid, true) AS definition
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE tc.table_schema = 'public'
  AND n.nspname = 'public'
  AND tc.table_name = 'book_friends'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ================================================================
-- 4) Expected indexes presence
-- ================================================================
WITH expected_indexes(index_name) AS (
  VALUES
    ('idx_books_owner_id'),
    ('idx_pages_book_id'),
    ('idx_book_friends_book_id'),
    ('idx_book_friends_user_id'),
    ('idx_images_book_id'),
    ('idx_images_uploaded_by'),
    ('idx_question_pools_category'),
    ('idx_question_pools_is_active'),
    ('idx_sandbox_pages_user_id'),
    ('idx_sandbox_pages_updated_at')
),
actual_indexes AS (
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT 'missing_index' AS issue, e.index_name AS object_name
FROM expected_indexes e
LEFT JOIN actual_indexes a ON a.indexname = e.index_name
WHERE a.indexname IS NULL
ORDER BY object_name;

-- ================================================================
-- 5) Unexpected indexes that should be gone
-- ================================================================
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_friendships_user_id',
    'idx_friendships_friend_id',
    'idx_pages_theme_id',
    'idx_pages_layout_id',
    'idx_pages_color_palette_id'
  )
ORDER BY indexname;

-- ================================================================
-- 6) Triggers that should NOT exist
-- ================================================================
SELECT event_object_table AS table_name, trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'update_conversations_updated_at',
    'update_conversation_on_message',
    'update_messages_updated_at',
    'update_questions_updated_at'
  )
ORDER BY event_object_table, trigger_name;

-- ================================================================
-- 7) Required trigger/function check
-- ================================================================
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'update_answers_updated_at';

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'update_answers_updated_at';

-- ================================================================
-- 8) Extra custom functions not expected by database.sql
-- (uuid-ossp functions are extension-provided and allowed)
-- ================================================================
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_conversation_on_message',
    'update_conversations_updated_at',
    'update_messages_updated_at',
    'update_questions_updated_at'
  )
ORDER BY p.proname;

-- ================================================================
-- 9) Enum and extension sanity checks
-- ================================================================
SELECT
  t.typname AS enum_name,
  e.enumsortorder,
  e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('page_access_level', 'editor_interaction_level')
ORDER BY t.typname, e.enumsortorder;

SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'plpgsql')
ORDER BY extname;

-- ================================================================
-- 10) One-line status summary (0 rows in earlier mismatch queries is expected)
-- ================================================================
SELECT 'Post-check complete. Review result sets above: mismatch queries should return 0 rows.' AS status;
