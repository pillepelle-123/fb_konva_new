-- Add unique constraint to prevent duplicate answers per user per question
ALTER TABLE public.answers 
ADD CONSTRAINT unique_user_question 
UNIQUE (user_id, question_id);