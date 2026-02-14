-- Migration: Conversation Invitations for Direct Chats
CREATE TABLE IF NOT EXISTS public.conversation_invitations (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  inviter_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_conversation_invitations_invitee ON public.conversation_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_conversation_invitations_conversation ON public.conversation_invitations(conversation_id);
