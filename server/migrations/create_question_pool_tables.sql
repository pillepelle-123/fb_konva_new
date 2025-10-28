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
