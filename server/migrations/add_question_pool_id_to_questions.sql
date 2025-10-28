-- Add question_pool_id column to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question_pool_id INTEGER REFERENCES public.question_pool(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_question_pool_id ON public.questions(question_pool_id);

-- Add comment
COMMENT ON COLUMN public.questions.question_pool_id IS 'Reference to question_pool if this question originated from the pool';
