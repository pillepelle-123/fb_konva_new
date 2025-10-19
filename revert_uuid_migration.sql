-- Revert UUID migration back to incremental integer IDs

-- 1. Create new tables with integer primary keys
CREATE TABLE questions_reverted (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE answers_reverted (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions_reverted(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE question_pages_reverted (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions_reverted(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, page_id)
);

-- 2. Migrate existing data
INSERT INTO questions_reverted (book_id, question_text, created_by, created_at, updated_at)
SELECT book_id, question_text, created_by, created_at, updated_at 
FROM questions;

-- 3. Drop old tables and rename new ones
DROP TABLE IF EXISTS question_pages;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;

ALTER TABLE questions_reverted RENAME TO questions;
ALTER TABLE answers_reverted RENAME TO answers;
ALTER TABLE question_pages_reverted RENAME TO question_pages;

-- 4. Create indexes
CREATE INDEX idx_questions_book_id ON questions(book_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);
CREATE INDEX idx_question_pages_question_id ON question_pages(question_id);
CREATE INDEX idx_question_pages_page_id ON question_pages(page_id);