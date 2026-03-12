BEGIN;

CREATE OR REPLACE FUNCTION normalize_asset_identifier_refs(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  key TEXT;
  value JSONB;
  normalized_value JSONB;
  identifier_text TEXT;
  resolved_uuid TEXT;
  uuid_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  IF payload IS NULL THEN
    RETURN payload;
  END IF;

  CASE jsonb_typeof(payload)
    WHEN 'object' THEN
      result := '{}'::jsonb;

      FOR key, value IN SELECT * FROM jsonb_each(payload)
      LOOP
        normalized_value := normalize_asset_identifier_refs(value);

        IF key = 'backgroundImageId' AND jsonb_typeof(normalized_value) = 'string' THEN
          identifier_text := trim(both '"' from normalized_value::text);
          IF identifier_text <> '' AND NOT (identifier_text ~* uuid_regex) THEN
            SELECT bi.id::text
            INTO resolved_uuid
            FROM background_images bi
            WHERE LOWER(bi.slug) = LOWER(identifier_text)
            LIMIT 1;

            IF resolved_uuid IS NOT NULL THEN
              normalized_value := to_jsonb(resolved_uuid);
            END IF;
          END IF;
        ELSIF key = 'stickerId' AND jsonb_typeof(normalized_value) = 'string' THEN
          identifier_text := trim(both '"' from normalized_value::text);
          IF identifier_text <> '' AND NOT (identifier_text ~* uuid_regex) THEN
            SELECT s.id::text
            INTO resolved_uuid
            FROM stickers s
            WHERE LOWER(s.slug) = LOWER(identifier_text)
            LIMIT 1;

            IF resolved_uuid IS NOT NULL THEN
              normalized_value := to_jsonb(resolved_uuid);
            END IF;
          END IF;
        END IF;

        result := result || jsonb_build_object(key, normalized_value);
      END LOOP;

      RETURN result;

    WHEN 'array' THEN
      SELECT COALESCE(
        jsonb_agg(normalize_asset_identifier_refs(item.value) ORDER BY item.ordinality),
        '[]'::jsonb
      )
      INTO result
      FROM jsonb_array_elements(payload) WITH ORDINALITY AS item(value, ordinality);

      RETURN result;

    ELSE
      RETURN payload;
  END CASE;
END;
$$;

UPDATE pages
SET elements = normalize_asset_identifier_refs(elements)
WHERE elements IS NOT NULL
  AND elements::text ~ '"(backgroundImageId|stickerId)"';

DO $$
BEGIN
  IF to_regclass('background_image_designs') IS NOT NULL THEN
    EXECUTE '
      UPDATE background_image_designs
      SET canvas_structure = normalize_asset_identifier_refs(canvas_structure)
      WHERE canvas_structure IS NOT NULL
        AND canvas_structure::text ~ ''"(backgroundImageId|stickerId)"''
    ';
  END IF;
END $$;

DROP FUNCTION IF EXISTS normalize_asset_identifier_refs(JSONB);

COMMIT;
