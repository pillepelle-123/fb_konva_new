-- Test Seed: Fügt Test-User und Test-Answer ein
-- Nur für Entwicklung/Testing

-- Test-User anlegen
WITH inserted_user AS (
  INSERT INTO public.users (name, email, password_hash, role, registered)
  VALUES (
    'Test User Seed',
    'testseed@example.com',
    crypt('test123', gen_salt('bf', 10)),
    'user',
    true
  ) 
  ON CONFLICT (email) DO UPDATE 
  SET name = 'Test User Seed (Updated)'
  RETURNING id
)
-- Test-Answer einfügen (wenn Question existiert)
INSERT INTO public.answers (id, question_id, user_id, answer_text, created_at, updated_at, is_active)
SELECT 
  'ed6ac0ce-c641-46d7-9d90-71af997cd617'::uuid,
  '8ff68a04-bf1f-4db3-9170-dfe14dabb7e4'::uuid,
  (SELECT id FROM inserted_user LIMIT 1),
  'Dies ist eine Antwort, die über das Database-Seed Skript zum Test eingefügt wurde.',
  '2026-03-08 16:16:05'::timestamp,
  '2026-03-08 16:16:05'::timestamp,
  true
WHERE EXISTS (SELECT 1 FROM public.questions WHERE id = '8ff68a04-bf1f-4db3-9170-dfe14dabb7e4')
ON CONFLICT (id) DO UPDATE 
SET answer_text = 'Dies ist eine Antwort, die über das Database-Seed Skript zum Test eingefügt wurde. (Updated)';

-- Ausgabe
SELECT 
  (SELECT COUNT(*) FROM public.users WHERE email = 'testseed@example.com') as users_inserted,
  (SELECT COUNT(*) FROM public.answers WHERE id = 'ed6ac0ce-c641-46d7-9d90-71af997cd617') as answers_inserted;
