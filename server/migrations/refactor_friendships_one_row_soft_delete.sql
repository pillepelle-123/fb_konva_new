-- Migration: friendships - eine Zeile pro Freundschaft + Soft Delete (ended_at)
-- Umbenennen zu .sql und ausführen: psql $DATABASE_URL -f <datei>.sql

-- 1. Spalten hinzufügen
ALTER TABLE public.friendships
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_id INTEGER REFERENCES public.friend_invitations(id);

-- 2. user_blocks.friendship_id: Zeiger von "Reverse"-Zeilen auf kanonische Zeile umbiegen
UPDATE public.user_blocks ub
SET friendship_id = (
  SELECT f2.id FROM public.friendships f2
  WHERE f2.user_id = (SELECT f1.friend_id FROM public.friendships f1 WHERE f1.id = ub.friendship_id)
    AND f2.friend_id = (SELECT f1.user_id FROM public.friendships f1 WHERE f1.id = ub.friendship_id)
  LIMIT 1
)
WHERE ub.friendship_id IS NOT NULL
  AND ub.friendship_id IN (SELECT id FROM public.friendships WHERE user_id > friend_id);

-- 3. Duplikat-Zeilen löschen (nur user_id < friend_id behalten)
DELETE FROM public.friendships WHERE user_id >= friend_id;

-- 4. CHECK-Constraint: user_id < friend_id
ALTER TABLE public.friendships
  ADD CONSTRAINT chk_friendships_user_id_lt_friend_id CHECK (user_id < friend_id);

-- 5. Indizes für Abfragen
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id) WHERE ended_at IS NULL;
