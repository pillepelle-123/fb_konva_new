-- Migration script to add messenger tables
-- Run this script to add messaging functionality

-- Set search path to public schema
SET search_path TO public;

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create conversation_participants table (many-to-many between users and conversations)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create message_read_status table (track which messages have been read by which users)
CREATE TABLE IF NOT EXISTS public.message_read_status (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON public.message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON public.message_read_status(user_id);

-- Create trigger for conversations updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

-- Create trigger for messages updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Create trigger to update conversation updated_at when new message is added
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();