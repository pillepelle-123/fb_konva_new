CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sticker_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES sticker_categories(id) ON DELETE RESTRICT,
  description TEXT,
  format TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'local' CHECK (storage_type IN ('local', 's3')),
  file_path TEXT,
  thumbnail_path TEXT,
  bucket TEXT,
  object_key TEXT,
  tags TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stickers_category_id ON stickers(category_id);
CREATE INDEX IF NOT EXISTS idx_stickers_storage_type ON stickers(storage_type);










