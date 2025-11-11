CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS background_image_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS background_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES background_image_categories(id) ON DELETE RESTRICT,
  description TEXT,
  format TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'local' CHECK (storage_type IN ('local', 's3')),
  file_path TEXT,
  thumbnail_path TEXT,
  bucket TEXT,
  object_key TEXT,
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

CREATE INDEX IF NOT EXISTS idx_background_images_category_id ON background_images(category_id);
CREATE INDEX IF NOT EXISTS idx_background_images_storage_type ON background_images(storage_type);

