-- Create editor_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS public.editor_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    setting_type VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id, setting_type, setting_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_editor_settings_user_book ON public.editor_settings(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_editor_settings_type ON public.editor_settings(setting_type);