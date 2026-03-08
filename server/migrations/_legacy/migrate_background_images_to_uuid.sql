-- ================================================================
-- Migration: Convert background_images.id from SERIAL to UUID
-- ================================================================
-- DBVisualizer-safe, re-runnable migration (no DO/BEGIN blocks).
--
-- Handles dependent tables:
-- - theme_page_backgrounds.background_image_id
-- - background_image_templates.id
-- - background_image_designs.id
-- - theme_template_backgrounds.background_image_id
-- - theme_designer_backgrounds.background_image_id
--
-- Keeps original filenames untouched (file_path / thumbnail_path unchanged).
-- ================================================================

-- Step 0: Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create helper UUID mapping column (re-runnable)
ALTER TABLE IF EXISTS background_images
  ADD COLUMN IF NOT EXISTS id_new UUID;

-- Keep already-migrated UUID ids stable on reruns
UPDATE background_images
SET id_new = id::text::uuid
WHERE id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (id_new IS NULL OR id_new <> id::text::uuid);

-- Fill missing helper UUIDs (legacy integer rows)
UPDATE background_images
SET id_new = uuid_generate_v4()
WHERE id_new IS NULL;

-- Step 2: Drop referencing foreign keys (if they exist)
-- Note: Constraint name is singular (old table name before rename)
ALTER TABLE IF EXISTS theme_page_backgrounds
  DROP CONSTRAINT IF EXISTS theme_page_background_background_image_id_fkey;
ALTER TABLE IF EXISTS background_image_templates
  DROP CONSTRAINT IF EXISTS background_image_templates_id_fkey;
ALTER TABLE IF EXISTS background_image_designs
  DROP CONSTRAINT IF EXISTS background_image_designs_id_fkey;
ALTER TABLE IF EXISTS theme_template_backgrounds
  DROP CONSTRAINT IF EXISTS theme_template_backgrounds_background_image_id_fkey;
ALTER TABLE IF EXISTS theme_designer_backgrounds
  DROP CONSTRAINT IF EXISTS theme_designer_backgrounds_background_image_id_fkey;

-- Step 2b: Drop dependent view that blocks ALTER COLUMN TYPE
DROP VIEW IF EXISTS theme_backgrounds_unified;

-- Step 3: Convert dependent columns to UUID using the mapping
ALTER TABLE IF EXISTS theme_page_backgrounds
  ADD COLUMN IF NOT EXISTS background_image_id_new UUID;
ALTER TABLE IF EXISTS background_image_templates
  ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE IF EXISTS background_image_designs
  ADD COLUMN IF NOT EXISTS id_new UUID;
ALTER TABLE IF EXISTS theme_template_backgrounds
  ADD COLUMN IF NOT EXISTS background_image_id_new UUID;
ALTER TABLE IF EXISTS theme_designer_backgrounds
  ADD COLUMN IF NOT EXISTS background_image_id_new UUID;

-- 3a) Preserve already UUID-shaped values
UPDATE theme_page_backgrounds
SET background_image_id_new = background_image_id::text::uuid
WHERE background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (background_image_id_new IS NULL OR background_image_id_new <> background_image_id::text::uuid);

UPDATE background_image_templates
SET id_new = id::text::uuid
WHERE id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (id_new IS NULL OR id_new <> id::text::uuid);

UPDATE background_image_designs
SET id_new = id::text::uuid
WHERE id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (id_new IS NULL OR id_new <> id::text::uuid);

UPDATE theme_template_backgrounds
SET background_image_id_new = background_image_id::text::uuid
WHERE background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (background_image_id_new IS NULL OR background_image_id_new <> background_image_id::text::uuid);

UPDATE theme_designer_backgrounds
SET background_image_id_new = background_image_id::text::uuid
WHERE background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  AND (background_image_id_new IS NULL OR background_image_id_new <> background_image_id::text::uuid);

-- 3b) Map legacy integer ids to generated UUIDs via join
UPDATE theme_page_backgrounds t
SET background_image_id_new = bi.id_new
FROM background_images bi
WHERE NOT (t.background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
  AND bi.id::text = t.background_image_id::text
  AND (t.background_image_id_new IS NULL OR t.background_image_id_new <> bi.id_new);

UPDATE background_image_templates t
SET id_new = bi.id_new
FROM background_images bi
WHERE NOT (t.id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
  AND bi.id::text = t.id::text
  AND (t.id_new IS NULL OR t.id_new <> bi.id_new);

UPDATE background_image_designs t
SET id_new = bi.id_new
FROM background_images bi
WHERE NOT (t.id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
  AND bi.id::text = t.id::text
  AND (t.id_new IS NULL OR t.id_new <> bi.id_new);

UPDATE theme_template_backgrounds t
SET background_image_id_new = bi.id_new
FROM background_images bi
WHERE NOT (t.background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
  AND bi.id::text = t.background_image_id::text
  AND (t.background_image_id_new IS NULL OR t.background_image_id_new <> bi.id_new);

UPDATE theme_designer_backgrounds t
SET background_image_id_new = bi.id_new
FROM background_images bi
WHERE NOT (t.background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
  AND bi.id::text = t.background_image_id::text
  AND (t.background_image_id_new IS NULL OR t.background_image_id_new <> bi.id_new);

-- 3c) Change column types without subqueries in USING clause
ALTER TABLE IF EXISTS theme_page_backgrounds
  ALTER COLUMN background_image_id TYPE UUID
  USING background_image_id_new;

ALTER TABLE IF EXISTS background_image_templates
  ALTER COLUMN id TYPE UUID
  USING id_new;

ALTER TABLE IF EXISTS background_image_designs
  ALTER COLUMN id TYPE UUID
  USING id_new;

ALTER TABLE IF EXISTS theme_template_backgrounds
  ALTER COLUMN background_image_id TYPE UUID
  USING background_image_id_new;

ALTER TABLE IF EXISTS theme_designer_backgrounds
  ALTER COLUMN background_image_id TYPE UUID
  USING background_image_id_new;

-- 3d) Cleanup helper columns
ALTER TABLE IF EXISTS theme_page_backgrounds
  DROP COLUMN IF EXISTS background_image_id_new;
ALTER TABLE IF EXISTS background_image_templates
  DROP COLUMN IF EXISTS id_new;
ALTER TABLE IF EXISTS background_image_designs
  DROP COLUMN IF EXISTS id_new;
ALTER TABLE IF EXISTS theme_template_backgrounds
  DROP COLUMN IF EXISTS background_image_id_new;
ALTER TABLE IF EXISTS theme_designer_backgrounds
  DROP COLUMN IF EXISTS background_image_id_new;

-- Step 4: Convert primary key background_images.id to UUID
ALTER TABLE IF EXISTS background_images
  ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS background_images
  ALTER COLUMN id TYPE UUID
  USING (
    CASE
      WHEN id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
        THEN id::text::uuid
      ELSE id_new
    END
  );
ALTER TABLE IF EXISTS background_images
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Step 5: Keep helper mapping column for safe re-runs after partial failures.
-- Optional manual cleanup after successful migration and verification:
-- ALTER TABLE background_images DROP COLUMN IF EXISTS id_new;

-- Step 6: Recreate foreign keys
ALTER TABLE IF EXISTS theme_page_backgrounds
  DROP CONSTRAINT IF EXISTS theme_page_backgrounds_background_image_id_fkey;
ALTER TABLE IF EXISTS theme_page_backgrounds
  ADD CONSTRAINT theme_page_backgrounds_background_image_id_fkey
  FOREIGN KEY (background_image_id) REFERENCES background_images(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS background_image_templates
  DROP CONSTRAINT IF EXISTS background_image_templates_id_fkey;
ALTER TABLE IF EXISTS background_image_templates
  ADD CONSTRAINT background_image_templates_id_fkey
  FOREIGN KEY (id) REFERENCES background_images(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS background_image_designs
  DROP CONSTRAINT IF EXISTS background_image_designs_id_fkey;
ALTER TABLE IF EXISTS background_image_designs
  ADD CONSTRAINT background_image_designs_id_fkey
  FOREIGN KEY (id) REFERENCES background_images(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS theme_template_backgrounds
  DROP CONSTRAINT IF EXISTS theme_template_backgrounds_background_image_id_fkey;
ALTER TABLE IF EXISTS theme_template_backgrounds
  ADD CONSTRAINT theme_template_backgrounds_background_image_id_fkey
  FOREIGN KEY (background_image_id) REFERENCES background_images(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS theme_designer_backgrounds
  DROP CONSTRAINT IF EXISTS theme_designer_backgrounds_background_image_id_fkey;
ALTER TABLE IF EXISTS theme_designer_backgrounds
  ADD CONSTRAINT theme_designer_backgrounds_background_image_id_fkey
  FOREIGN KEY (background_image_id) REFERENCES background_images(id) ON DELETE CASCADE;

-- Step 7: Ensure indices exist
DROP INDEX IF EXISTS idx_theme_page_backgrounds_image;
CREATE INDEX IF NOT EXISTS idx_theme_page_backgrounds_image
  ON theme_page_backgrounds(background_image_id);

DROP INDEX IF EXISTS idx_theme_template_backgrounds_image;
CREATE INDEX IF NOT EXISTS idx_theme_template_backgrounds_image
  ON theme_template_backgrounds(background_image_id);

DROP INDEX IF EXISTS idx_theme_designer_backgrounds_image;
CREATE INDEX IF NOT EXISTS idx_theme_designer_backgrounds_image
  ON theme_designer_backgrounds(background_image_id);

-- Step 8: Recreate unified view after type migration
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

-- Verification
SELECT
  'background_images' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN 1 END) AS valid_uuids
FROM background_images
UNION ALL
SELECT
  'theme_page_backgrounds' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(CASE WHEN background_image_id::text SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' THEN 1 END) AS valid_uuids
FROM theme_page_backgrounds;
