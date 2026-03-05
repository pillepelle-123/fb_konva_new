-- Migration: Rename line/border style properties from "theme" to "style"
-- Properties: borderTheme->borderStyle, ruledLinesTheme->ruledLinesStyle,
--             frameTheme->frameStyle, inheritTheme->inheritStyle,
--             border.theme->border.style, ruledLines.theme->ruledLines.style
-- Run before/at deployment. No backward compatibility - app reads only new properties.

UPDATE themes
SET config = (
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  config::text,
  '"borderTheme"', '"borderStyle"'),
  '"ruledLinesTheme"', '"ruledLinesStyle"'),
  '"frameTheme"', '"frameStyle"'),
  '"inheritTheme"', '"inheritStyle"'),
  '"theme": "default"', '"style": "default"'),
  '"theme": "rough"', '"style": "rough"'),
  '"theme": "glow"', '"style": "glow"'),
  '"theme": "candy"', '"style": "candy"'),
  '"theme": "zigzag"', '"style": "zigzag"'),
  '"theme": "wobbly"', '"style": "wobbly"'),
  '"theme": "dashed"', '"style": "dashed"')
)::jsonb
WHERE config IS NOT NULL
  AND (
    config::text LIKE '%borderTheme%'
    OR config::text LIKE '%ruledLinesTheme%'
    OR config::text LIKE '%frameTheme%'
    OR config::text LIKE '%inheritTheme%'
    OR config::text LIKE '%"theme": "default"%'
    OR config::text LIKE '%"theme": "rough"%'
    OR config::text LIKE '%"theme": "glow"%'
    OR config::text LIKE '%"theme": "candy"%'
    OR config::text LIKE '%"theme": "zigzag"%'
    OR config::text LIKE '%"theme": "wobbly"%'
    OR config::text LIKE '%"theme": "dashed"%'
  );

-- Migrate pages.elements JSON (user-created elements with borderTheme, ruledLinesTheme, etc.)
UPDATE pages
SET elements = (
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  elements::text,
  '"borderTheme"', '"borderStyle"'),
  '"ruledLinesTheme"', '"ruledLinesStyle"'),
  '"frameTheme"', '"frameStyle"'),
  '"inheritTheme"', '"inheritStyle"'),
  '"theme": "default"', '"style": "default"'),
  '"theme": "rough"', '"style": "rough"'),
  '"theme": "glow"', '"style": "glow"'),
  '"theme": "candy"', '"style": "candy"'),
  '"theme": "zigzag"', '"style": "zigzag"'),
  '"theme": "wobbly"', '"style": "wobbly"'),
  '"theme": "dashed"', '"style": "dashed"')
)::jsonb
WHERE elements IS NOT NULL
  AND (
    elements::text LIKE '%borderTheme%'
    OR elements::text LIKE '%ruledLinesTheme%'
    OR elements::text LIKE '%frameTheme%'
    OR elements::text LIKE '%inheritTheme%'
    OR elements::text LIKE '%"theme": "default"%'
    OR elements::text LIKE '%"theme": "rough"%'
    OR elements::text LIKE '%"theme": "glow"%'
    OR elements::text LIKE '%"theme": "candy"%'
    OR elements::text LIKE '%"theme": "zigzag"%'
    OR elements::text LIKE '%"theme": "wobbly"%'
    OR elements::text LIKE '%"theme": "dashed"%'
  );

-- Migrate sandbox_pages.elements JSON (same structure as pages.elements)
UPDATE sandbox_pages
SET page_data = (
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  page_data::text,
  '"borderTheme"', '"borderStyle"'),
  '"ruledLinesTheme"', '"ruledLinesStyle"'),
  '"frameTheme"', '"frameStyle"'),
  '"inheritTheme"', '"inheritStyle"'),
  '"theme": "default"', '"style": "default"'),
  '"theme": "rough"', '"style": "rough"'),
  '"theme": "glow"', '"style": "glow"'),
  '"theme": "candy"', '"style": "candy"'),
  '"theme": "zigzag"', '"style": "zigzag"'),
  '"theme": "wobbly"', '"style": "wobbly"'),
  '"theme": "dashed"', '"style": "dashed"')
)::jsonb
WHERE page_data IS NOT NULL
  AND (
    page_data::text LIKE '%borderTheme%'
    OR page_data::text LIKE '%ruledLinesTheme%'
    OR page_data::text LIKE '%frameTheme%'
    OR page_data::text LIKE '%inheritTheme%'
    OR page_data::text LIKE '%"theme": "default"%'
    OR page_data::text LIKE '%"theme": "rough"%'
    OR page_data::text LIKE '%"theme": "glow"%'
    OR page_data::text LIKE '%"theme": "candy"%'
    OR page_data::text LIKE '%"theme": "zigzag"%'
    OR page_data::text LIKE '%"theme": "wobbly"%'
    OR page_data::text LIKE '%"theme": "dashed"%'
  );
