-- Add page access level enum
CREATE TYPE page_access_level AS ENUM ('form_only', 'own_page', 'all_pages');

-- Add editor interaction level enum  
CREATE TYPE editor_interaction_level AS ENUM ('no_access', 'answer_only', 'full_edit', 'full_edit_with_settings');

-- Add new columns to book_friends table
ALTER TABLE book_friends 
ADD COLUMN page_access_level page_access_level DEFAULT 'own_page',
ADD COLUMN editor_interaction_level editor_interaction_level DEFAULT 'full_edit';

-- Set defaults for existing authors
UPDATE book_friends 
SET page_access_level = 'own_page', 
    editor_interaction_level = 'full_edit' 
WHERE book_role = 'author';

-- Publishers get full access by default
UPDATE book_friends 
SET page_access_level = 'all_pages', 
    editor_interaction_level = 'full_edit_with_settings' 
WHERE book_role = 'publisher';
