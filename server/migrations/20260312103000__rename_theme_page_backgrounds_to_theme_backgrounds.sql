BEGIN;

ALTER TABLE IF EXISTS public.theme_page_backgrounds
  RENAME TO theme_backgrounds;

ALTER INDEX IF EXISTS public.idx_theme_page_backgrounds_image
  RENAME TO idx_theme_backgrounds_image;

COMMIT;
