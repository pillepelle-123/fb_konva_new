BEGIN;

DO $$
DECLARE
  page_record RECORD;
  new_elements JSONB;
  transformed_items JSONB;
  background_ref TEXT;
  resolved_background_id TEXT;
  uuid_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  FOR page_record IN
    SELECT id, elements
    FROM pages
    WHERE elements IS NOT NULL
  LOOP
    new_elements := page_record.elements;

    background_ref := page_record.elements -> 'background' ->> 'backgroundImageId';
    IF background_ref IS NOT NULL
      AND background_ref <> ''
      AND NOT (background_ref ~* uuid_regex)
    THEN
      SELECT bi.id::TEXT
      INTO resolved_background_id
      FROM background_images bi
      WHERE LOWER(bi.slug) = LOWER(background_ref)
      LIMIT 1;

      IF resolved_background_id IS NOT NULL THEN
        new_elements := jsonb_set(
          new_elements,
          '{background,backgroundImageId}',
          to_jsonb(resolved_background_id),
          true
        );
      END IF;
    END IF;

    IF jsonb_typeof(new_elements -> 'elements') = 'array' THEN
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN item.element ->> 'type' = 'sticker'
              AND item.element ? 'stickerId'
              AND COALESCE(item.element ->> 'stickerId', '') <> ''
              AND NOT ((item.element ->> 'stickerId') ~* uuid_regex)
            THEN COALESCE(
              (
                SELECT jsonb_set(
                  item.element,
                  '{stickerId}',
                  to_jsonb(s.id::TEXT),
                  true
                )
                FROM stickers s
                WHERE LOWER(s.slug) = LOWER(item.element ->> 'stickerId')
                LIMIT 1
              ),
              item.element
            )
            ELSE item.element
          END
          ORDER BY item.ordinality
        ),
        '[]'::jsonb
      )
      INTO transformed_items
      FROM jsonb_array_elements(new_elements -> 'elements') WITH ORDINALITY AS item(element, ordinality);

      new_elements := jsonb_set(new_elements, '{elements}', transformed_items, true);
    END IF;

    IF new_elements IS DISTINCT FROM page_record.elements THEN
      UPDATE pages
      SET elements = new_elements
      WHERE id = page_record.id;
    END IF;
  END LOOP;
END $$;

COMMIT;
