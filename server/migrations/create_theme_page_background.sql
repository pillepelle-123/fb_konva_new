-- Migration: Tabelle theme_page_backgrounds für Theme-Hintergrundbild-Zuordnung

CREATE TABLE IF NOT EXISTS theme_page_backgrounds (
  theme_id INTEGER PRIMARY KEY REFERENCES themes(id) ON DELETE CASCADE,
  background_image_id UUID NOT NULL REFERENCES background_images(id) ON DELETE RESTRICT,
  size TEXT NOT NULL DEFAULT 'cover' CHECK (size IN ('cover', 'contain', 'stretch', 'contain-repeat')),
  position TEXT NOT NULL DEFAULT 'top-left' CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
  repeat BOOLEAN NOT NULL DEFAULT false,
  width INTEGER NOT NULL DEFAULT 100 CHECK (width >= 10 AND width <= 200),
  opacity NUMERIC NOT NULL DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  apply_palette BOOLEAN NOT NULL DEFAULT true,
  palette_mode TEXT NOT NULL DEFAULT 'palette' CHECK (palette_mode IN ('palette', 'monochrome', 'auto', 'standard'))
);

CREATE INDEX IF NOT EXISTS idx_theme_page_backgrounds_image ON theme_page_backgrounds(background_image_id);
