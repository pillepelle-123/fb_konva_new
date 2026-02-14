CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ###############################################################
-- Drop existing tables (in reverse order to respect foreign keys)
-- ###############################################################

DROP TABLE IF EXISTS message_read_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS pdf_exports CASCADE;
DROP TABLE IF EXISTS stickers CASCADE;
DROP TABLE IF EXISTS sticker_categories CASCADE;
DROP TABLE IF EXISTS background_images CASCADE;
DROP TABLE IF EXISTS background_image_categories CASCADE;
DROP TABLE IF EXISTS user_question_assignments CASCADE;
DROP TABLE IF EXISTS question_pool CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS question_pages CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS page_assignments CASCADE;
DROP TABLE IF EXISTS editor_settings CASCADE;
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS book_friends CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types
DROP TYPE IF EXISTS page_access_level CASCADE;
DROP TYPE IF EXISTS editor_interaction_level CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_answers_updated_at() CASCADE;

-- ###############################################################
-- Base Tables: Users, Books, Pages, Book Friends Tables
-- ###############################################################

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  registered BOOLEAN NOT NULL DEFAULT TRUE,
  invitation_token UUID,
  invited_by INTEGER REFERENCES users(id),
  profile_picture_192 VARCHAR(255),
  profile_picture_32 VARCHAR(255),
  admin_state VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Books Table
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_size VARCHAR(50) NOT NULL DEFAULT 'A4',
  orientation VARCHAR(50) NOT NULL DEFAULT 'portrait',
  layout_template_id VARCHAR(255),
  theme_id VARCHAR(255),
  color_palette_id VARCHAR(255),
  min_pages INTEGER,
  max_pages INTEGER,
  page_pairing_enabled BOOLEAN DEFAULT FALSE,
  special_pages_config JSONB,
  layout_strategy VARCHAR(50),
  layout_random_mode VARCHAR(50),
  assisted_layouts JSONB,
  group_chat_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  invite_message TEXT,
  archived BOOLEAN DEFAULT FALSE,
  admin_state VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for book's styling columns
CREATE INDEX idx_books_layout_template_id ON books(layout_template_id);
CREATE INDEX idx_books_theme_id ON books(theme_id);
CREATE INDEX idx_books_color_palette_id ON books(color_palette_id);
CREATE INDEX idx_books_owner_id ON books(owner_id);

-- Pages Table
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  elements JSONB DEFAULT '[]'::jsonb,
  layout_template_id VARCHAR(255),
  theme_id VARCHAR(255),
  color_palette_id VARCHAR(255),
  page_type VARCHAR(50),
  page_pair_id VARCHAR(100),
  is_special_page BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_printable BOOLEAN DEFAULT TRUE,
  layout_variation VARCHAR(50),
  background_variation VARCHAR(50),
  background_transform JSONB,
  admin_state VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, page_number)
);

CREATE INDEX idx_pages_book_id ON pages(book_id);

-- Create enum types for book_friends
CREATE TYPE page_access_level AS ENUM ('form_only', 'own_page', 'all_pages');
CREATE TYPE editor_interaction_level AS ENUM ('no_access', 'answer_only', 'full_edit', 'full_edit_with_settings');

-- Book Collaborators Table
CREATE TABLE book_friends (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_role VARCHAR(50) NOT NULL DEFAULT 'author', -- 'author' or 'publisher'
  page_access_level page_access_level DEFAULT 'own_page',
  editor_interaction_level editor_interaction_level DEFAULT 'full_edit',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, user_id)
);

CREATE INDEX idx_book_friends_book_id ON book_friends(book_id);
CREATE INDEX idx_book_friends_user_id ON book_friends(user_id);

-- ###############################################################
-- Question Pool Tables (must be created before questions table)
-- ###############################################################

-- Create question_pool table
CREATE TABLE IF NOT EXISTS public.question_pool (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_pool_category ON public.question_pool(category);
CREATE INDEX IF NOT EXISTS idx_question_pool_is_active ON public.question_pool(is_active);


-- Insert some sample questions
INSERT INTO public.question_pool (question_text, category, language) VALUES
('What is your favorite memory from childhood?', 'Personal', 'en'),
('What makes you laugh the most?', 'Personal', 'en'),
('What is your biggest dream?', 'Personal', 'en'),
('Who is your hero and why?', 'Personal', 'en'),
('What are you most grateful for?', 'Personal', 'en'),
('What is your favorite book?', 'Favorites', 'en'),
('What is your favorite movie?', 'Favorites', 'en'),
('What is your favorite food?', 'Favorites', 'en'),
('What is your favorite place to visit?', 'Favorites', 'en'),
('What is your favorite hobby?', 'Favorites', 'en'),
('What would you do if you won the lottery?', 'Hypothetical', 'en'),
('If you could have dinner with anyone, who would it be?', 'Hypothetical', 'en'),
('If you could travel anywhere, where would you go?', 'Hypothetical', 'en'),
('What superpower would you choose?', 'Hypothetical', 'en'),
('If you could change one thing about the world, what would it be?', 'Hypothetical', 'en');

-- ###############################################################
-- Questions and Answers Tables
-- ###############################################################

-- Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    display_order INTEGER,
    question_pool_id INTEGER REFERENCES public.question_pool(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_questions_book_id ON questions(book_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_pool_id ON public.questions(question_pool_id);
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON public.questions(display_order);

-- Question Pages Junction Table
CREATE TABLE IF NOT EXISTS question_pages (
    id SERIAL PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, page_id)
);

CREATE INDEX IF NOT EXISTS idx_question_pages_question_id ON question_pages(question_id);
CREATE INDEX IF NOT EXISTS idx_question_pages_page_id ON question_pages(page_id);

-- Answers Table
CREATE TABLE IF NOT EXISTS answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answers_is_active ON answers(is_active);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);

-- Create Constraint
ALTER TABLE public.answers 
ADD CONSTRAINT unique_user_question 
UNIQUE (user_id, question_id);

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_answers_updated_at
    BEFORE UPDATE ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_answers_updated_at();

-- ###############################################################
-- Images Table
-- ###############################################################

CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE NO ACTION,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  s3_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_images_book_id ON images(book_id);
CREATE INDEX idx_images_uploaded_by ON images(uploaded_by);

-- ###############################################################
-- Editor Settings Table
-- ###############################################################

CREATE TABLE IF NOT EXISTS public.editor_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    setting_type VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id, setting_type, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_editor_settings_user_book ON public.editor_settings(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_editor_settings_type ON public.editor_settings(setting_type);

-- ###############################################################
-- Page Assignments Table
-- ###############################################################

CREATE TABLE page_assignments (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, user_id)
);

CREATE INDEX idx_page_assignments_page_id ON page_assignments(page_id);
CREATE INDEX idx_page_assignments_user_id ON page_assignments(user_id);

-- ###############################################################
-- Friendships Table
-- ###############################################################

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- ###############################################################
-- Messenger Tables
-- ###############################################################

CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT conversations_book_id_unique UNIQUE(book_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_book_id ON public.conversations(book_id);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON public.conversations(active);
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON public.conversations(is_group);

CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE TABLE message_read_status (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX idx_message_read_status_user_id ON message_read_status(user_id);

-- ###############################################################
-- User Question Assignments Table
-- ###############################################################

CREATE TABLE IF NOT EXISTS public.user_question_assignments (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES public.books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, user_id, question_id)
);


-- ###############################################################
-- Stickers Tables
-- ###############################################################

CREATE TABLE IF NOT EXISTS sticker_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES sticker_categories(id) ON DELETE RESTRICT,
  description TEXT,
  format TEXT NOT NULL,
  file_path TEXT,
  thumbnail_path TEXT,
  tags TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stickers_category_id ON stickers(category_id);

-- ###############################################################
-- Background Images Tables
-- ###############################################################

CREATE TABLE IF NOT EXISTS background_image_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS background_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES background_image_categories(id) ON DELETE RESTRICT,
  description TEXT,
  format TEXT NOT NULL,
  file_path TEXT,
  thumbnail_path TEXT,
  default_size TEXT,
  default_position TEXT,
  default_repeat TEXT,
  default_width INTEGER,
  default_opacity REAL,
  background_color JSONB,
  palette_slots TEXT,
  tags TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_images_category_id ON background_images(category_id);

-- ###############################################################
-- PDF Exports Tables
-- ###############################################################

CREATE TABLE IF NOT EXISTS public.pdf_exports (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    quality VARCHAR(50) NOT NULL CHECK (quality IN ('preview', 'medium', 'printing', 'excellent')),
    page_range VARCHAR(50) NOT NULL CHECK (page_range IN ('all', 'range', 'current')),
    start_page INTEGER,
    end_page INTEGER,
    file_path VARCHAR(500),
    file_size BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_pdf_exports_book_id ON public.pdf_exports(book_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_user_id ON public.pdf_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_status ON public.pdf_exports(status);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_created_at ON public.pdf_exports(created_at);

-- ###############################################################
-- Migration: Friend Invitations and User Blocks
-- ###############################################################

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

-- ###############################################################
-- Migration: Conversation Participant Settings (muted, archived)
-- ###############################################################

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

-- ###############################################################
-- Migration: Conversation Invitations for Direct Chats
-- ###############################################################

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

-- ###############################################################
-- Insert initial admin user (password: admin123)
-- ###############################################################

INSERT INTO users (name, email, password_hash, role) 
VALUES ('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

