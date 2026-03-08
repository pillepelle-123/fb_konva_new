-- Add is_active field to answers table to track if answers are still valid
-- When a user is removed from a book, their answers remain but are marked as inactive

ALTER TABLE public.answers 
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add index for performance when filtering active answers
CREATE INDEX idx_answers_is_active ON public.answers(is_active);

-- Add comment to explain the field
COMMENT ON COLUMN public.answers.is_active IS 'Indicates if the answer is still active. Set to false when user is removed from book but answer data is preserved.';