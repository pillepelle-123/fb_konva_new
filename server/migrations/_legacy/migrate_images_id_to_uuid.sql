CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.images
  ADD COLUMN id_uuid UUID DEFAULT uuid_generate_v4();

UPDATE public.images
SET id_uuid = uuid_generate_v4()
WHERE id_uuid IS NULL;

ALTER TABLE public.images
  ALTER COLUMN id_uuid SET NOT NULL;

ALTER TABLE public.images
  DROP CONSTRAINT images_pkey;

ALTER TABLE public.images
  DROP COLUMN id;

ALTER TABLE public.images
  RENAME COLUMN id_uuid TO id;

ALTER TABLE public.images
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE public.images
  ADD CONSTRAINT images_pkey PRIMARY KEY (id);
