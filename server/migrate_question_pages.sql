-- Migration script to add question_pages junction table and updated_at to questions
-- Run this script on existing databases to update the schema

-- Set search path to public schema
SET search_path TO public;

-- Add updated_at column to questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.questions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create question_pages junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.question_pages (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES public.questions(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES public.pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, page_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_question_pages_question_id ON public.question_pages(question_id);
CREATE INDEX IF NOT EXISTS idx_question_pages_page_id ON public.question_pages(page_id);

-- Create trigger for questions updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION update_questions_updated_at();