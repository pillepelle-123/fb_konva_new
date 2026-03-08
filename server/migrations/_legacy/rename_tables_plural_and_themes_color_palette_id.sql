-- Migration: Tabellennamen auf Plural-Konvention und themes.palette_id -> color_palette_id
-- Konvention: Tabellennamen im Plural (z.B. books)
--
-- Einmal ausfuehren. Bei Fehlern "relation does not exist" oder "column does not exist"
-- wurde die Migration bereits durchgefuehrt - diese Fehler koennen ignoriert werden.

ALTER TABLE public.question_pool RENAME TO question_pools;

ALTER TABLE public.sandbox_page RENAME TO sandbox_pages;

ALTER TABLE public.theme_page_background RENAME TO theme_page_backgrounds;

ALTER TABLE public.themes RENAME COLUMN palette_id TO color_palette_id;
