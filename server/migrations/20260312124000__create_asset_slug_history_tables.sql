BEGIN;

CREATE TABLE IF NOT EXISTS background_image_slug_history (
  id BIGSERIAL PRIMARY KEY,
  background_image_id UUID NOT NULL REFERENCES background_images(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (background_image_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_background_image_slug_history_slug_ci
  ON background_image_slug_history (LOWER(slug));

CREATE INDEX IF NOT EXISTS idx_background_image_slug_history_image_id
  ON background_image_slug_history (background_image_id);

CREATE TABLE IF NOT EXISTS sticker_slug_history (
  id BIGSERIAL PRIMARY KEY,
  sticker_id UUID NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sticker_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sticker_slug_history_slug_ci
  ON sticker_slug_history (LOWER(slug));

CREATE INDEX IF NOT EXISTS idx_sticker_slug_history_sticker_id
  ON sticker_slug_history (sticker_id);

COMMIT;
