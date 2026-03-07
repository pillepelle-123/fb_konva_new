-- Entfernt legacy_id-Spalte aus images-Tabelle
-- Nur ausführen wenn alle Migrationen abgeschlossen sind!

ALTER TABLE public.images DROP COLUMN IF EXISTS legacy_id;
