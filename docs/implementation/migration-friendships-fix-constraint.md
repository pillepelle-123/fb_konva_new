# Fix: friendships CHECK-Constraint Fehler

Die Migration `refactor_friendships_one_row_soft_delete.sql` schlägt fehl, weil noch Zeilen mit `user_id >= friend_id` existieren (Duplikate oder ungültige Selbst-Freundschaften).

## Lösung

**Option A: Migration anpassen und erneut ausführen**

In `server/migrations/refactor_friendships_one_row_soft_delete.sql` Zeile 21 ändern:

```diff
- DELETE FROM public.friendships WHERE user_id > friend_id;
+ DELETE FROM public.friendships WHERE user_id >= friend_id;
```

Dann die Schritte 3–5 erneut ausführen (Schritte 1–2 sind bereits gelaufen):

```sql
-- 3. Duplikat- und ungültige Zeilen löschen
DELETE FROM public.friendships WHERE user_id >= friend_id;

-- 4. CHECK-Constraint (falls noch nicht vorhanden)
ALTER TABLE public.friendships
  ADD CONSTRAINT chk_friendships_user_id_lt_friend_id CHECK (user_id < friend_id);

-- 5. Indizes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id) WHERE ended_at IS NULL;
```

**Option B: Nur den Fix ausführen**

Falls die Migration bis Schritt 3 durchgelaufen ist, aber der CHECK fehlgeschlagen hat:

```sql
DELETE FROM public.friendships WHERE user_id >= friend_id;
ALTER TABLE public.friendships
  ADD CONSTRAINT chk_friendships_user_id_lt_friend_id CHECK (user_id < friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id) WHERE ended_at IS NULL;
```

**Hinweis:** Wenn der Constraint bereits existiert (z.B. nach erneutem Versuch), zuerst droppen:

```sql
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS chk_friendships_user_id_lt_friend_id;
```
