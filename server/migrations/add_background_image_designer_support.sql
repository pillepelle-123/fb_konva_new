-- Migration: Add Background Image Designer Support (PLAIN SQL ONLY)
-- No procedural blocks (no DO/BEGIN/IF)
-- IMPORTANT: This variant assumes background_images.id is UUID.

-- Step 1: Rename format -> type (execute only once)
ALTER TABLE background_images
  RENAME COLUMN format TO type;

-- Normalize existing values first (must happen BEFORE check constraint)
UPDATE background_images
SET type = 'template'
WHERE type IS NULL OR type NOT IN ('template', 'designer');

-- Recreate check constraint
ALTER TABLE background_images
  DROP CONSTRAINT IF EXISTS background_images_type_check;

ALTER TABLE background_images
  ADD CONSTRAINT background_images_type_check
  CHECK (type IN ('template', 'designer'));

-- Step 2: Template-specific extension table
CREATE TABLE IF NOT EXISTS background_image_templates (
  id UUID PRIMARY KEY REFERENCES background_images(id) ON DELETE CASCADE,
  original_filename TEXT,
  file_size INTEGER,
  mime_type TEXT,
  dimensions JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Designer-specific extension table
CREATE TABLE IF NOT EXISTS background_image_designs (
  id UUID PRIMARY KEY REFERENCES background_images(id) ON DELETE CASCADE,
  canvas_structure JSONB NOT NULL,
  canvas_width INTEGER DEFAULT 2480,
  canvas_height INTEGER DEFAULT 3508,
  version INTEGER DEFAULT 1,
  last_generated_at TIMESTAMPTZ,
  generated_image_cache JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_designs_structure
  ON background_image_designs USING GIN (canvas_structure);

-- Step 4: Separate theme mapping tables (template vs designer)
CREATE TABLE IF NOT EXISTS theme_template_backgrounds (
  id BIGSERIAL PRIMARY KEY,
  theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  background_image_id UUID NOT NULL REFERENCES background_images(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN ('cover', 'left', 'right', 'all')),
  size TEXT DEFAULT 'cover' CHECK (size IN ('cover', 'contain', 'stretch', 'contain-repeat')),
  position TEXT DEFAULT 'center' CHECK (position IN ('top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right')),
  repeat BOOLEAN DEFAULT false,
  width INTEGER DEFAULT 100 CHECK (width >= 10 AND width <= 200),
  opacity NUMERIC DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  apply_palette BOOLEAN DEFAULT true,
  palette_mode TEXT DEFAULT 'palette' CHECK (palette_mode IN ('palette', 'monochrome', 'auto', 'standard')),
  UNIQUE (theme_id, page_type)
);

CREATE TABLE IF NOT EXISTS theme_designer_backgrounds (
  id BIGSERIAL PRIMARY KEY,
  theme_id INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  background_image_id UUID NOT NULL REFERENCES background_images(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL CHECK (page_type IN ('cover', 'left', 'right', 'all')),
  opacity NUMERIC DEFAULT 1 CHECK (opacity >= 0 AND opacity <= 1),
  UNIQUE (theme_id, page_type)
);

CREATE INDEX IF NOT EXISTS idx_theme_template_backgrounds_theme
  ON theme_template_backgrounds(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_template_backgrounds_image
  ON theme_template_backgrounds(background_image_id);
CREATE INDEX IF NOT EXISTS idx_theme_designer_backgrounds_theme
  ON theme_designer_backgrounds(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_designer_backgrounds_image
  ON theme_designer_backgrounds(background_image_id);

-- Step 5: Unified view
CREATE OR REPLACE VIEW theme_backgrounds_unified AS
SELECT
  id,
  theme_id,
  background_image_id,
  page_type,
  size,
  position,
  repeat,
  width,
  opacity,
  apply_palette,
  palette_mode,
  'template' AS bg_type
FROM theme_template_backgrounds
UNION ALL
SELECT
  id,
  theme_id,
  background_image_id,
  page_type,
  NULL AS size,
  'fullscreen' AS position,
  false AS repeat,
  100 AS width,
  opacity,
  false AS apply_palette,
  'standard' AS palette_mode,
  'designer' AS bg_type
FROM theme_designer_backgrounds;

-- Optional legacy migration from theme_page_backgrounds (only run if table exists):
-- INSERT INTO theme_template_backgrounds (
--   theme_id, background_image_id, page_type, size, position, repeat, width, opacity, apply_palette, palette_mode
-- )
-- SELECT
--   theme_id,
--   background_image_id,
--   'all',
--   COALESCE(size, 'cover'),
--   COALESCE(position, 'center'),
--   COALESCE(repeat, false),
--   COALESCE(width, 100),
--   COALESCE(opacity, 1),
--   COALESCE(apply_palette, true),
--   COALESCE(palette_mode, 'palette')
-- FROM theme_page_backgrounds;

COMMENT ON TABLE background_image_templates IS 'Template-based background images (SVG/PNG/JPG uploads)';
COMMENT ON TABLE background_image_designs IS 'Designer-created background images with canvas structure';
COMMENT ON TABLE theme_template_backgrounds IS 'Theme associations for template background images';
COMMENT ON TABLE theme_designer_backgrounds IS 'Theme associations for designer background images';
