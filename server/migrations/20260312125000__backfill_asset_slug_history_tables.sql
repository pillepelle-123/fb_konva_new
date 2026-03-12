BEGIN;

INSERT INTO background_image_slug_history (background_image_id, slug)
SELECT bi.id, bi.slug
FROM background_images bi
WHERE bi.slug IS NOT NULL
ON CONFLICT (background_image_id, slug) DO NOTHING;

INSERT INTO sticker_slug_history (sticker_id, slug)
SELECT s.id, s.slug
FROM stickers s
WHERE s.slug IS NOT NULL
ON CONFLICT (sticker_id, slug) DO NOTHING;

COMMIT;
