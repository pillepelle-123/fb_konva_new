CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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