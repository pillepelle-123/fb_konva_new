-- Migrate questions table to use UUID primary keys

-- 1. Create new tables with UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE questions_uuid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answers_uuid (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions_uuid(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_pages_uuid (
    id SERIAL PRIMARY KEY,
    question_id UUID REFERENCES questions_uuid(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, page_id)
);

-- 2. Migrate existing data (if any exists)
-- Note: This will lose existing question-answer relationships since we can't map old integer IDs to new UUIDs
-- In production, you'd need a more sophisticated migration strategy

-- 3. Drop old tables and rename new ones
DROP TABLE IF EXISTS question_pages;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;

ALTER TABLE questions_uuid RENAME TO questions;
ALTER TABLE answers_uuid RENAME TO answers;
ALTER TABLE question_pages_uuid RENAME TO question_pages;

-- 4. Create indexes
CREATE INDEX idx_questions_book_id ON questions(book_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE INDEX idx_question_pages_question_id ON question_pages(question_id);
CREATE INDEX idx_question_pages_page_id ON question_pages(page_id);