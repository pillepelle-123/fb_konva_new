-- Migration: Rename role to book_role in book_friends table
-- This distinguishes between overall user role (users.role) and book-specific role (book_friends.book_role)

ALTER TABLE public.book_friends RENAME COLUMN role TO book_role;

-- Update any existing data if needed (optional, since the values remain the same)
-- The column now clearly indicates it's a book-specific role