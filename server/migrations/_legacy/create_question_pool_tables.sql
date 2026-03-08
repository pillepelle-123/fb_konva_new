-- Create question_pools table
CREATE TABLE IF NOT EXISTS public.question_pools (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  category VARCHAR(100),
  language VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_question_pools_category ON public.question_pools(category);
CREATE INDEX IF NOT EXISTS idx_question_pools_is_active ON public.question_pools(is_active);

-- Insert some sample questions
INSERT INTO public.question_pools (question_text, category, language) VALUES
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
