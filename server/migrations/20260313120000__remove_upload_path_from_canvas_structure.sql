-- Migration: Remove uploadPath from designer canvas_structure image items
-- For items that have uploadPath but no assetId (UUID), attempt to backfill assetId
-- by matching the filename from uploadPath against background_image_designer_image_assets.file_path.
-- Then remove uploadPath from all image-type items unconditionally.

BEGIN;

CREATE OR REPLACE FUNCTION migrate_canvas_image_items_to_asset_id(canvas JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  items JSONB;
  item JSONB;
  new_item JSONB;
  new_items JSONB := '[]'::JSONB;
  upload_path TEXT;
  asset_id TEXT;
  resolved_id UUID;
  extracted_filename TEXT;
  uuid_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  IF canvas IS NULL THEN
    RETURN canvas;
  END IF;

  items := canvas -> 'items';

  IF items IS NULL OR jsonb_typeof(items) <> 'array' THEN
    RETURN canvas;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(items) LOOP
    IF (item ->> 'type') = 'image' THEN
      asset_id   := item ->> 'assetId';
      upload_path := item ->> 'uploadPath';

      IF (asset_id IS NULL OR asset_id = '' OR NOT (asset_id ~* uuid_regex))
         AND upload_path IS NOT NULL AND upload_path <> ''
      THEN
        -- Extract filename from uploadPath (last non-empty path segment)
        extracted_filename := regexp_replace(
          trim(trailing '/' from upload_path),
          '^.*/',
          ''
        );

        -- Try to find matching asset by file_path suffix
        SELECT a.id
        INTO   resolved_id
        FROM   background_image_designer_image_assets a
        WHERE  a.file_path = extracted_filename
            OR a.file_path LIKE '%/' || extracted_filename
        LIMIT  1;

        IF resolved_id IS NOT NULL THEN
          new_item := jsonb_set(item, '{assetId}', to_jsonb(resolved_id::text)) #- '{uploadPath}';
        ELSE
          -- No matching asset found — remove uploadPath but keep item (assetId will be missing/empty)
          new_item := item #- '{uploadPath}';
        END IF;

      ELSE
        -- assetId already present and valid: just remove uploadPath
        new_item := item #- '{uploadPath}';
      END IF;

      new_items := new_items || jsonb_build_array(new_item);
    ELSE
      -- Non-image items: pass through unchanged
      new_items := new_items || jsonb_build_array(item);
    END IF;
  END LOOP;

  RETURN jsonb_set(canvas, '{items}', new_items);
END;
$$;

-- Apply to all designs whose canvas_structure might contain uploadPath on image items
UPDATE background_image_designs
SET    canvas_structure = migrate_canvas_image_items_to_asset_id(canvas_structure)
WHERE  canvas_structure IS NOT NULL
  AND (
    canvas_structure::text LIKE '%"uploadPath"%'
    OR (
      canvas_structure::text LIKE '%"type":"image"%'
      OR canvas_structure::text LIKE '%"type": "image"%'
    )
  );

DROP FUNCTION IF EXISTS migrate_canvas_image_items_to_asset_id(JSONB);

COMMIT;

-- DOWN
-- BEGIN;
-- (No safe undo: uploadPath values are not preserved after removal.
--  Restore from backup if needed.)
-- COMMIT;
