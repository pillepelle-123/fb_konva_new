-- Migration Script: Cleanup redundant properties in pages.elements JSON
-- This script migrates fillOpacity -> backgroundOpacity and strokeWidth -> borderWidth for Shapes
-- and removes fillColor and strokeColor fallbacks

-- IMPORTANT: Run this script on a backup first and verify the results!

-- 1. Migrate fillOpacity to backgroundOpacity for Shapes
-- IMPROVED VERSION: Also removes fillOpacity even if backgroundOpacity already exists
DO $$
DECLARE
  page_record RECORD;
  elements_array JSONB;
  element_record JSONB;
  updated_elements JSONB := '[]'::JSONB;
  element_index INT;
  has_changes BOOLEAN := false;
BEGIN
  FOR page_record IN SELECT id, elements FROM pages WHERE elements IS NOT NULL AND elements::jsonb->'elements' IS NOT NULL
  LOOP
    elements_array := page_record.elements::jsonb->'elements';
    updated_elements := '[]'::JSONB;
    has_changes := false;

    FOR element_index IN 0..jsonb_array_length(elements_array) - 1
    LOOP
      element_record := elements_array->element_index;

      -- Check if this is a shape element with fillOpacity
      IF (element_record->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
         AND element_record->>'fillOpacity' IS NOT NULL
      THEN
        -- If backgroundOpacity doesn't exist, migrate fillOpacity to backgroundOpacity
        IF (element_record->>'backgroundOpacity') IS NULL THEN
          element_record := jsonb_set(element_record, '{backgroundOpacity}', to_jsonb((element_record->>'fillOpacity')::numeric));
        END IF;
        -- Always remove fillOpacity for shapes (even if backgroundOpacity already exists)
        element_record := element_record - 'fillOpacity';
        has_changes := true;
      END IF;

      updated_elements := updated_elements || element_record;
    END LOOP;

    IF has_changes THEN
      UPDATE pages
      SET elements = jsonb_set(page_record.elements::jsonb, '{elements}', updated_elements)
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

-- 2. Migrate strokeWidth to borderWidth for Shapes (KEEP strokeWidth for line/brush)
-- IMPROVED VERSION: Only removes strokeWidth from shapes, keeps it for brush/line
DO $$
DECLARE
  page_record RECORD;
  elements_array JSONB;
  element_record JSONB;
  updated_elements JSONB := '[]'::JSONB;
  element_index INT;
  has_changes BOOLEAN := false;
BEGIN
  FOR page_record IN SELECT id, elements FROM pages WHERE elements IS NOT NULL AND elements::jsonb->'elements' IS NOT NULL
  LOOP
    elements_array := page_record.elements::jsonb->'elements';
    updated_elements := '[]'::JSONB;
    has_changes := false;

    FOR element_index IN 0..jsonb_array_length(elements_array) - 1
    LOOP
      element_record := elements_array->element_index;

      -- ONLY remove strokeWidth from SHAPES (not from brush/line elements)
      IF (element_record->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
         AND element_record->>'strokeWidth' IS NOT NULL
      THEN
        -- If borderWidth doesn't exist, migrate strokeWidth to borderWidth
        IF (element_record->>'borderWidth') IS NULL THEN
          element_record := jsonb_set(element_record, '{borderWidth}', to_jsonb((element_record->>'strokeWidth')::numeric));
        END IF;
        -- Remove strokeWidth ONLY from shapes
        element_record := element_record - 'strokeWidth';
        has_changes := true;
      END IF;

      updated_elements := updated_elements || element_record;
    END LOOP;

    IF has_changes THEN
      UPDATE pages
      SET elements = jsonb_set(page_record.elements::jsonb, '{elements}', updated_elements)
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

-- 3. Remove fillColor (if any still exists)
DO $$
DECLARE
  page_record RECORD;
  elements_array JSONB;
  element_record JSONB;
  updated_elements JSONB := '[]'::JSONB;
  element_index INT;
  has_changes BOOLEAN := false;
BEGIN
  FOR page_record IN SELECT id, elements FROM pages WHERE elements IS NOT NULL AND elements::jsonb->'elements' IS NOT NULL
  LOOP
    elements_array := page_record.elements::jsonb->'elements';
    updated_elements := '[]'::JSONB;
    has_changes := false;
    
    FOR element_index IN 0..jsonb_array_length(elements_array) - 1
    LOOP
      element_record := elements_array->element_index;
      
      -- Remove fillColor if it exists
      IF element_record->>'fillColor' IS NOT NULL THEN
        element_record := element_record - 'fillColor';
        has_changes := true;
      END IF;
      
      updated_elements := updated_elements || element_record;
    END LOOP;
    
    IF has_changes THEN
      UPDATE pages
      SET elements = jsonb_set(page_record.elements::jsonb, '{elements}', updated_elements)
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

-- 4. Remove strokeColor (if any still exists)
DO $$
DECLARE
  page_record RECORD;
  elements_array JSONB;
  element_record JSONB;
  updated_elements JSONB := '[]'::JSONB;
  element_index INT;
  has_changes BOOLEAN := false;
BEGIN
  FOR page_record IN SELECT id, elements FROM pages WHERE elements IS NOT NULL AND elements::jsonb->'elements' IS NOT NULL
  LOOP
    elements_array := page_record.elements::jsonb->'elements';
    updated_elements := '[]'::JSONB;
    has_changes := false;
    
    FOR element_index IN 0..jsonb_array_length(elements_array) - 1
    LOOP
      element_record := elements_array->element_index;
      
      -- Remove strokeColor if it exists
      IF element_record->>'strokeColor' IS NOT NULL THEN
        element_record := element_record - 'strokeColor';
        has_changes := true;
      END IF;
      
      updated_elements := updated_elements || element_record;
    END LOOP;
    
    IF has_changes THEN
      UPDATE pages
      SET elements = jsonb_set(page_record.elements::jsonb, '{elements}', updated_elements)
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

-- Verification queries (run these after migration to verify results)

-- Count elements with fillOpacity (should be 0 for shapes)
SELECT COUNT(*) as shapes_with_fillOpacity
FROM pages, jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE (elem->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
  AND elem->>'fillOpacity' IS NOT NULL;

-- Find pages with shapes that still have fillOpacity
SELECT DISTINCT pages.id AS page_id
FROM pages
CROSS JOIN LATERAL jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE elements IS NOT NULL
  AND elements::jsonb->'elements' IS NOT NULL
  AND (elem->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
  AND elem->>'fillOpacity' IS NOT NULL
ORDER BY pages.id;

-- Count elements with strokeWidth for shapes (should be 0)
SELECT COUNT(*) as shapes_with_strokeWidth
FROM pages, jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE (elem->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
  AND elem->>'strokeWidth' IS NOT NULL;

-- Count elements with strokeWidth for brush/line (should be > 0)
SELECT COUNT(*) as brush_line_with_strokeWidth
FROM pages, jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE (elem->>'type') IN ('brush', 'brush-multicolor', 'line')
  AND elem->>'strokeWidth' IS NOT NULL;

-- Find pages with shapes that still have strokeWidth
SELECT DISTINCT pages.id AS page_id
FROM pages
CROSS JOIN LATERAL jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE elements IS NOT NULL
  AND elements::jsonb->'elements' IS NOT NULL
  AND (elem->>'type') IN ('rect', 'circle', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley')
  AND elem->>'strokeWidth' IS NOT NULL
ORDER BY pages.id;

-- Count elements with fillColor (should be 0)
SELECT COUNT(*) as elements_with_fillColor
FROM pages, jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE elem->>'fillColor' IS NOT NULL;

-- Count elements with strokeColor (should be 0)
SELECT COUNT(*) as elements_with_strokeColor
FROM pages, jsonb_array_elements(elements::jsonb->'elements') AS elem
WHERE elem->>'strokeColor' IS NOT NULL;

-- #######################################################################
-- CORRECTION: Restore strokeWidth for brush/line elements that lost it
-- #######################################################################

-- CORRECTION: Add default strokeWidth back to brush/line elements that don't have it
DO $$
DECLARE
  page_record RECORD;
  elements_array JSONB;
  element_record JSONB;
  updated_elements JSONB := '[]'::JSONB;
  element_index INT;
  has_changes BOOLEAN := false;
BEGIN
  FOR page_record IN SELECT id, elements FROM pages WHERE elements IS NOT NULL AND elements::jsonb->'elements' IS NOT NULL
  LOOP
    elements_array := page_record.elements::jsonb->'elements';
    updated_elements := '[]'::JSONB;
    has_changes := false;

    FOR element_index IN 0..jsonb_array_length(elements_array) - 1
    LOOP
      element_record := elements_array->element_index;

      -- Add strokeWidth back to brush/line elements that don't have it
      IF (element_record->>'type') IN ('brush', 'brush-multicolor', 'line')
         AND element_record->>'strokeWidth' IS NULL
      THEN
        -- Add default strokeWidth of 2 for brush/line elements
        element_record := jsonb_set(element_record, '{strokeWidth}', '2'::jsonb);
        has_changes := true;
      END IF;

      updated_elements := updated_elements || element_record;
    END LOOP;

    IF has_changes THEN
      UPDATE pages
      SET elements = jsonb_set(page_record.elements::jsonb, '{elements}', updated_elements)
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

