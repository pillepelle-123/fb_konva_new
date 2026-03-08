BEGIN;

CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

COMMIT;
