-- Page Assignments Table
CREATE TABLE IF NOT EXISTS page_assignments (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  assigned_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(page_id, user_id, book_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_page_assignments_book_id ON page_assignments(book_id);
CREATE INDEX IF NOT EXISTS idx_page_assignments_page_id ON page_assignments(page_id);