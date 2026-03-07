CREATE TABLE IF NOT EXISTS "public"."page_images" (
  "page_id" INTEGER NOT NULL REFERENCES "public"."pages"("id") ON DELETE CASCADE,
  "image_id" UUID NOT NULL REFERENCES "public"."images"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("page_id", "image_id")
);

CREATE INDEX IF NOT EXISTS "idx_page_images_page_id" ON "public"."page_images"("page_id");
CREATE INDEX IF NOT EXISTS "idx_page_images_image_id" ON "public"."page_images"("image_id");

INSERT INTO "public"."page_images" ("page_id", "image_id")
SELECT DISTINCT
  "p"."id",
  ("e"."elem"->>'imageId')::UUID
FROM "public"."pages" "p"
CROSS JOIN LATERAL "jsonb_array_elements"(
  CASE
    WHEN "jsonb_typeof"("p"."elements") = 'object' THEN COALESCE(("p"."elements"->'elements'), '[]'::jsonb)
    WHEN "jsonb_typeof"("p"."elements") = 'array' THEN "p"."elements"
    ELSE '[]'::jsonb
  END
) AS "e"("elem")
WHERE "e"."elem"->>'type' = 'image'
  AND "e"."elem"->'imageId' IS NOT NULL
  AND "e"."elem"->>'imageId' NOT IN ('', 'undefined')
  AND ("e"."elem"->>'imageId') SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
ON CONFLICT DO NOTHING;
