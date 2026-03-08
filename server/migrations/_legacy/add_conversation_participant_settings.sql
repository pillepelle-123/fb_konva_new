-- Migration: Conversation Participant Settings (muted, archived)
CREATE TABLE IF NOT EXISTS public.conversation_participant_settings (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cps_conversation ON public.conversation_participant_settings(conversation_id);
CREATE INDEX IF NOT EXISTS idx_cps_user ON public.conversation_participant_settings(user_id);
