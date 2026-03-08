-- Migration script to add PDF exports table
-- Run this script to add PDF export functionality

-- Set search path to public schema
SET search_path TO public;

-- Create pdf_exports table
CREATE TABLE IF NOT EXISTS public.pdf_exports (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    quality VARCHAR(50) NOT NULL CHECK (quality IN ('preview', 'medium', 'printing')),
    page_range VARCHAR(50) NOT NULL CHECK (page_range IN ('all', 'range', 'current')),
    start_page INTEGER,
    end_page INTEGER,
    file_path VARCHAR(500),
    file_size BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pdf_exports_book_id ON public.pdf_exports(book_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_user_id ON public.pdf_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_status ON public.pdf_exports(status);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_created_at ON public.pdf_exports(created_at);


