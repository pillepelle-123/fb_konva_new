-- Add download_count to pdf_exports for tracking how often a PDF export was downloaded
ALTER TABLE public.pdf_exports 
ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
