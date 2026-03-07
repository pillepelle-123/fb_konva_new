-- ================================================================
-- Migration: Migrate pages.elements asset references to UUID
-- ================================================================
-- Re-runnable migration.
--
-- Changes:
-- 1) background.backgroundImageTemplateId (slug) -> background.backgroundImageId (UUID)
-- 2) background.value URL to /api/background-images/<uuid>/file
-- 3) Remove legacy backgroundImageTemplateId property
-- 4) Sticker src URL to /api/stickers/<uuid>/file using stickerId
--
-- NOTE: Preserves pages.elements object shape.
-- ================================================================

-- Step 1: Add backgroundImageId by slug lookup (only where missing)
UPDATE pages p
SET elements = jsonb_set(
  p.elements,
  '{background}',
  (p.elements->'background') || jsonb_build_object('backgroundImageId', bi.id::text),
  true
)
FROM background_images bi
WHERE p.elements IS NOT NULL
  AND jsonb_typeof(p.elements) = 'object'
  AND p.elements->'background' IS NOT NULL
  AND COALESCE(p.elements->'background'->>'backgroundImageTemplateId', '') <> ''
  AND COALESCE(p.elements->'background'->>'backgroundImageId', '') = ''
  AND bi.slug = p.elements->'background'->>'backgroundImageTemplateId';

-- Step 2: Update background image URL to UUID form
UPDATE pages p
SET elements = jsonb_set(
  p.elements,
  '{background,value}',
  to_jsonb('/api/background-images/' || bi.id::text || '/file'),
  true
)
FROM background_images bi
WHERE p.elements IS NOT NULL
  AND jsonb_typeof(p.elements) = 'object'
  AND p.elements->'background' IS NOT NULL
  AND COALESCE(p.elements->'background'->>'value', '') LIKE '%/api/background-images/%'
  AND (
    bi.id::text = COALESCE(p.elements->'background'->>'backgroundImageId', '')
    OR bi.slug = COALESCE(p.elements->'background'->>'backgroundImageTemplateId', '')
  );

-- Step 3: Remove legacy backgroundImageTemplateId
UPDATE pages p
SET elements = jsonb_set(
  p.elements,
  '{background}',
  (p.elements->'background') - 'backgroundImageTemplateId',
  true
)
WHERE p.elements IS NOT NULL
  AND jsonb_typeof(p.elements) = 'object'
  AND p.elements->'background' IS NOT NULL
  AND (p.elements->'background' ? 'backgroundImageTemplateId');

-- Step 4: Update sticker URLs inside elements array, preserving root object
UPDATE pages p
SET elements = jsonb_set(
  p.elements,
  '{elements}',
  COALESCE(
    (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'type' = 'sticker'
               AND COALESCE(elem->>'stickerId', '') <> ''
               AND COALESCE(elem->>'src', '') LIKE '%/api/stickers/%'
            THEN elem || jsonb_build_object('src', '/api/stickers/' || (elem->>'stickerId') || '/file')
          ELSE elem
        END
      )
      FROM jsonb_array_elements(COALESCE(p.elements->'elements', '[]'::jsonb)) AS elem
    ),
    '[]'::jsonb
  ),
  true
)
WHERE p.elements IS NOT NULL
  AND jsonb_typeof(p.elements) = 'object'
  AND jsonb_typeof(COALESCE(p.elements->'elements', '[]'::jsonb)) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p.elements->'elements', '[]'::jsonb)) AS elem
    WHERE elem->>'type' = 'sticker'
      AND COALESCE(elem->>'stickerId', '') <> ''
      AND COALESCE(elem->>'src', '') LIKE '%/api/stickers/%'
  );

-- Verification
SELECT
  'pages_with_backgroundImageId' AS metric,
  COUNT(*) AS count
FROM pages
WHERE COALESCE(elements->'background'->>'backgroundImageId', '') <> ''
UNION ALL
SELECT
  'pages_with_legacy_backgroundImageTemplateId' AS metric,
  COUNT(*) AS count
FROM pages
WHERE elements->'background' ? 'backgroundImageTemplateId'
UNION ALL
SELECT
  'sticker_elements_with_uuid_url' AS metric,
  COALESCE(SUM(
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(COALESCE(p.elements->'elements', '[]'::jsonb)) AS elem
      WHERE elem->>'type' = 'sticker'
        AND COALESCE(elem->>'src', '') ~ '/api/stickers/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/file'
    )
  ), 0) AS count
FROM pages p;
