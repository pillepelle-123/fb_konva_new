ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS admin_status VARCHAR(50) NOT NULL DEFAULT 'active';

UPDATE public.users
SET admin_status = CASE
  WHEN registered = FALSE THEN 'invited'
  ELSE admin_status
END;

