CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Books Table
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  page_size VARCHAR(50) NOT NULL DEFAULT 'A4',
  orientation VARCHAR(50) NOT NULL DEFAULT 'portrait',
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pages Table
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  elements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, page_number)
);

-- Book Collaborators Table
CREATE TABLE book_friends (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  book_role VARCHAR(50) NOT NULL DEFAULT 'author', -- 'author' or 'publisher'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, user_id)
);


-- ###############################################################
-- Questions and Answers Tables
-- ###############################################################

-- Questions Table

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_pool_id INTEGER REFERENCES public.question_pool(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ####### ALT mit Serial statt UUID #########
-- CREATE TABLE questions (
--   id SERIAL PRIMARY KEY,
--   book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
--   question_text TEXT NOT NULL,
--   created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

CREATE INDEX IF NOT EXISTS idx_questions_book_id ON questions(book_id);
CREATE INDEX IF NOT EXISTS idx_questions_question_pool_id ON public.questions(question_pool_id);

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

-- ####### ALT mit Referenzierung auf Serial statt UUID (questions) #########
-- CREATE TABLE question_pages (
--   id SERIAL PRIMARY KEY,
--   question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
--   page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--   UNIQUE(question_id, page_id)
-- );

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

-- ####### ALT mit Serial statt UUID #########
-- CREATE TABLE IF NOT EXISTS answers (
--     id SERIAL PRIMARY KEY,
--     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
--     answer_text TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Create Constraint
ALTER TABLE public.answers 
ADD CONSTRAINT unique_user_question 
UNIQUE (user_id, question_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_user_id ON answers(user_id);


-- Create trigger to automatically update updated_at
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

-- Images Table
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE NO ACTION,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_images_book_id ON images(book_id);
CREATE INDEX idx_images_uploaded_by ON images(uploaded_by);

-- ###############################################################
-- Page Assignments Table
-- ###############################################################

-- Insert initial admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role) 
VALUES ('Admin User', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Page Assignments Table
CREATE TABLE page_assignments (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, user_id)
);

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

-- Create indexes for better performance
CREATE INDEX idx_books_owner_id ON books(owner_id);
CREATE INDEX idx_pages_book_id ON pages(book_id);
CREATE INDEX idx_book_friends_book_id ON book_friends(book_id);
CREATE INDEX idx_book_friends_user_id ON book_friends(user_id);
CREATE INDEX idx_questions_book_id ON questions(book_id);
CREATE INDEX idx_question_pages_question_id ON question_pages(question_id);
CREATE INDEX idx_question_pages_page_id ON question_pages(page_id);
CREATE INDEX idx_page_assignments_book_id ON page_assignments(book_id);
CREATE INDEX idx_page_assignments_page_id ON page_assignments(page_id);
CREATE INDEX idx_page_assignments_user_id ON page_assignments(user_id);

-- ###############################################################
-- Messenger Tables
-- ###############################################################

CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE message_read_status (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- Messenger Indexes
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX idx_message_read_status_user_id ON message_read_status(user_id);


-- ###############################################################
-- Question Pool Tables
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

-- Create book_questions junction table
CREATE TABLE IF NOT EXISTS public.book_questions (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  question_pool_id INTEGER NOT NULL REFERENCES public.question_pool(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(book_id, question_pool_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_book_questions_book_id ON public.book_questions(book_id);
CREATE INDEX IF NOT EXISTS idx_book_questions_question_pool_id ON public.book_questions(question_pool_id);
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

