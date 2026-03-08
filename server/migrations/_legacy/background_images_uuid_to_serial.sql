-- Migration: background_images.id von UUID auf SERIAL
-- slug bleibt UNIQUE und primÃ¤rer Client-Identifier (templateId, API-URLs)

-- 1. Neue Tabelle mit SERIAL id
CREATE TABLE IF NOT EXISTS background_images_new (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES background_image_categories(id) ON DELETE RESTRICT,
  description TEXT,
  format TEXT NOT NULL,
  file_path TEXT,
  thumbnail_path TEXT,
  default_size TEXT,
  default_position TEXT,
  default_repeat TEXT,
  default_width INTEGER,
  default_opacity REAL,
  background_color JSONB,
  palette_slots TEXT,
  tags TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Daten migrieren (ohne id â€“ SERIAL generiert neue IDs)
INSERT INTO background_images_new (
  slug, name, category_id, description, format,
  file_path, thumbnail_path, default_size, default_position, default_repeat,
  default_width, default_opacity, background_color, palette_slots, tags, metadata,
  created_at, updated_at
)
SELECT
  slug, name, category_id, description, format,
  file_path, thumbnail_path, default_size, default_position, default_repeat,
  default_width, default_opacity, background_color, palette_slots, tags, metadata,
  created_at, updated_at
FROM background_images;

-- 3. Alte Tabelle droppen
DROP TABLE IF EXISTS background_images CASCADE;

-- 4. Neue Tabelle umbenennen
ALTER TABLE background_images_new RENAME TO background_images;

-- 5. Indizes neu anlegen
CREATE INDEX IF NOT EXISTS idx_background_images_category_id ON background_images(category_id);
