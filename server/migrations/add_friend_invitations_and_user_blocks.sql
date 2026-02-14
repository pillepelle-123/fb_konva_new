-- Migration: Friend Invitations and User Blocks
CREATE TABLE IF NOT EXISTS public.friend_invitations (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(sender_id, receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_receiver ON public.friend_invitations(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_sender ON public.friend_invitations(sender_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friendship_id INTEGER REFERENCES public.friendships(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
