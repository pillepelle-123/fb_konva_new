-- Add S3 URL column to images table
ALTER TABLE public.images ADD COLUMN IF NOT EXISTS s3_url TEXT;

-- Update existing records to use S3 URLs (optional - for migration of existing data)
-- UPDATE public.images SET s3_url = CONCAT('https://fb-konva.s3.us-east-1.amazonaws.com/', file_path) WHERE s3_url IS NULL;