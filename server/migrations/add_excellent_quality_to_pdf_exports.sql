-- Migration script to add 'excellent' quality option to PDF exports
-- Run this script to extend PDF export quality options

-- Set search path to public schema
SET search_path TO public;

-- Drop existing constraint and add new one with 'excellent'
ALTER TABLE public.pdf_exports 
DROP CONSTRAINT IF EXISTS pdf_exports_quality_check;

ALTER TABLE public.pdf_exports 
ADD CONSTRAINT pdf_exports_quality_check 
CHECK (quality IN ('preview', 'medium', 'printing', 'excellent'));



