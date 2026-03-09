BEGIN;

CREATE TABLE IF NOT EXISTS background_image_designer_image_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS background_image_design_asset_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES background_image_designs(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES background_image_designer_image_assets(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (design_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_bg_designer_assets_created_at
  ON background_image_designer_image_assets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bg_design_asset_links_design_id
  ON background_image_design_asset_links(design_id);

CREATE INDEX IF NOT EXISTS idx_bg_design_asset_links_asset_id
  ON background_image_design_asset_links(asset_id);

COMMIT;
