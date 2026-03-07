UPDATE "public"."pages"
SET "elements" = CASE
  WHEN "jsonb_typeof"("elements") = 'object' THEN
    "elements" || "jsonb_build_object"('elements', COALESCE((SELECT "jsonb_agg"(elem - 'src')
      FROM "jsonb_array_elements"("elements"->'elements') elem), '[]'::jsonb))
  WHEN "jsonb_typeof"("elements") = 'array' THEN
    COALESCE((SELECT "jsonb_agg"(elem - 'src')
      FROM "jsonb_array_elements"("elements") elem), '[]'::jsonb)
  ELSE "elements"
END;

UPDATE "public"."pages"
SET "elements" = CASE
  WHEN "jsonb_typeof"("elements") = 'object' THEN
    "elements" || "jsonb_build_object"('elements', COALESCE((
      SELECT "jsonb_agg"(
        CASE WHEN elem->>'type' = 'image'
        THEN elem || "jsonb_build_object"('imageId', COALESCE((SELECT "id"::text FROM "public"."images" WHERE "legacy_id" = "split_part"(elem->>'src', '/', 4)::int), ''::text))
        ELSE elem END
      )
      FROM "jsonb_array_elements"("elements"->'elements') elem
    ), '[]'::jsonb))
  WHEN "jsonb_typeof"("elements") = 'array' THEN
    COALESCE((
      SELECT "jsonb_agg"(
        CASE WHEN elem->>'type' = 'image'
        THEN elem || "jsonb_build_object"('imageId', COALESCE((SELECT "id"::text FROM "public"."images" WHERE "legacy_id" = "split_part"(elem->>'src', '/', 4)::int), ''::text))
        ELSE elem END
      )
      FROM "jsonb_array_elements"("elements") elem
    ), '[]'::jsonb)
  ELSE "elements"
END;
