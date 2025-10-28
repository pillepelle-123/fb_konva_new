# Question Pool Feature Implementation

## Overview
Implemented a question pool feature that allows users to select from pre-formulated questions and add them to their books.

## Database Layer

### New Tables
1. **question_pool** - Stores the pool of available questions
   - `id` (SERIAL PRIMARY KEY)
   - `question_text` (TEXT)
   - `category` (VARCHAR) - e.g., "Personal", "Favorites", "Hypothetical"
   - `language` (VARCHAR) - default 'en'
   - `is_active` (BOOLEAN) - for soft delete/deactivation
   - `created_at`, `updated_at` (TIMESTAMP)

2. **book_questions** - Junction table tracking which pool questions were added to which books
   - `id` (SERIAL PRIMARY KEY)
   - `book_id` (INTEGER) - references books table
   - `question_pool_id` (INTEGER) - references question_pool table
   - `question_id` (UUID) - the actual question created in questions table
   - `added_at` (TIMESTAMP)
   - UNIQUE constraint on (book_id, question_pool_id) to prevent duplicates

### Migration Files
- `server/migrations/create_question_pool_tables.sql` - Creates tables with sample questions
- `server/migrations/run_question_pool_migration.js` - Migration runner script

### To Run Migration
```bash
cd server
node migrations/run_question_pool_migration.js
```

## Backend (Server)

### New Route: `/api/question-pool`
File: `server/routes/question-pool.js`

Endpoints:
- `GET /api/question-pool` - Get all active questions (with optional category/language filters)
- `GET /api/question-pool/categories` - Get list of available categories
- `POST /api/question-pool` - Admin: Add new question to pool
- `PUT /api/question-pool/:id` - Admin: Update question in pool
- `DELETE /api/question-pool/:id` - Admin: Delete question from pool

### Extended Route: `/api/questions`
File: `server/routes/questions.js`

New endpoint:
- `POST /api/questions/from-pool` - Add multiple questions from pool to a book
  - Takes `bookId` and `questionPoolIds[]`
  - Creates questions in questions table
  - Tracks in book_questions junction table
  - Returns created questions

## Frontend (Client)

### API Service
File: `client/src/services/api.ts`

New methods:
- `getQuestionPool(category?, language?)` - Fetch questions from pool
- `getQuestionPoolCategories()` - Fetch available categories
- `addQuestionsFromPool(bookId, questionPoolIds[])` - Add selected questions to book

### New Component: QuestionPoolModal
File: `client/src/components/features/questions/question-pool-modal.tsx`

Features:
- Search questions by text
- Filter by category
- Multi-select with checkboxes
- Shows count of available and selected questions
- "Add Selected" button to add questions to book

Props:
- `bookId` - The book to add questions to
- `onClose` - Close modal callback
- `onQuestionsAdded` - Callback with created questions

### Integration Point: Book Manager
File: `client/src/components/features/books/book-manager-content.tsx`

Changes:
- Added "Browse Question Pool" button in Questions & Answers tab
- Opens QuestionPoolModal when clicked
- Adds selected questions to temp state
- Questions are saved when user clicks "Save and Close"

## User Flow

1. User opens Book Manager
2. Navigates to "Questions & Answers" tab
3. Clicks "Browse Question Pool" button
4. Modal opens showing available questions
5. User can:
   - Search questions by text
   - Filter by category
   - Select multiple questions with checkboxes
6. User clicks "Add Selected"
7. Questions are added to the book's question list
8. User clicks "Save and Close" in Book Manager to persist

## Sample Questions Included

The migration includes 15 sample questions across 3 categories:
- **Personal**: childhood memories, dreams, heroes, gratitude
- **Favorites**: books, movies, food, places, hobbies
- **Hypothetical**: lottery, dinner guests, travel, superpowers, world changes

## Future Enhancements

Potential additions:
- Admin interface to manage question pool
- User-contributed questions (with moderation)
- More languages
- Question templates with placeholders
- Import/export question sets
- Analytics on most-used questions
