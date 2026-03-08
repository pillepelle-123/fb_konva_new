ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS admin_state VARCHAR(50) NOT NULL DEFAULT 'active';

UPDATE public.users
SET admin_state = CASE
  WHEN registered = FALSE THEN 'invited'
  ELSE admin_state
END;

