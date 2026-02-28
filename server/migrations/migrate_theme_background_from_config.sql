-- Migration: Bestehende Theme-Hintergrundbilder aus config.pageSettings.backgroundImage
-- nach theme_page_backgrounds übernehmen und aus config entfernen

-- 1. Für jedes Theme mit enabled=true und templateId: Zeile in theme_page_backgrounds anlegen
INSERT INTO theme_page_backgrounds (
  theme_id,
  background_image_id,
  size,
  position,
  repeat,
  width,
  opacity,
  apply_palette,
  palette_mode
)
SELECT
  t.id AS theme_id,
  bi.id AS background_image_id,
  COALESCE(
    NULLIF(TRIM(t.config->'pageSettings'->'backgroundImage'->>'size'), ''),
    'cover'
  )::TEXT AS size,
  COALESCE(
    NULLIF(TRIM(t.config->'pageSettings'->'backgroundImage'->>'position'), ''),
    'top-left'
  )::TEXT AS position,
  COALESCE(
    (t.config->'pageSettings'->'backgroundImage'->>'repeat')::boolean,
    false
  ) AS repeat,
  LEAST(200, GREATEST(10, COALESCE(
    (t.config->'pageSettings'->'backgroundImage'->>'width')::integer,
    100
  ))) AS width,
  LEAST(1, GREATEST(0, COALESCE(
    (t.config->'pageSettings'->'backgroundImage'->>'opacity')::numeric,
    1
  ))) AS opacity,
  COALESCE(
    (t.config->'pageSettings'->'backgroundImage'->>'applyPalette')::boolean,
    true
  ) AS apply_palette,
  COALESCE(
    NULLIF(TRIM(t.config->'pageSettings'->'backgroundImage'->>'paletteMode'), ''),
    'palette'
  )::TEXT AS palette_mode
FROM themes t
JOIN background_images bi ON bi.slug = (t.config->'pageSettings'->'backgroundImage'->>'templateId')
WHERE (t.config->'pageSettings'->'backgroundImage'->>'enabled')::boolean = true
  AND t.config->'pageSettings'->'backgroundImage'->>'templateId' IS NOT NULL
  AND TRIM(t.config->'pageSettings'->'backgroundImage'->>'templateId') != ''
ON CONFLICT (theme_id) DO NOTHING;

-- 2. backgroundImage aus config.pageSettings entfernen
UPDATE themes
SET config = (config::jsonb) #- '{pageSettings,backgroundImage}'
WHERE jsonb_exists(config->'pageSettings', 'backgroundImage');
