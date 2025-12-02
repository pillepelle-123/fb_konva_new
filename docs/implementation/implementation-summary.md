# UUID Implementation for Question-Answer Pairs

## Summary
Successfully implemented UUID system for Question-Answer pairs to ensure consistent ID matching between canvas elements and database records.

## Changes Made

### 1. Canvas Element Creation (canvas.tsx)
- **Question Tool**: When creating question-answer pairs, answer textbox now gets a UUID immediately
- **Answer Tool**: Standalone answer textboxes also get UUID immediately
- **QnA Tool**: Answer elements in QnA pairs get UUID on creation

### 2. CanvasElement Interface (editor-context.tsx)
- Changed `answerId?: number` to `answerId?: string` to support UUID format

### 3. Textbox Component (textbox.tsx)
- Updated inline editing to use element's `answerId` property instead of generating new UUIDs
- Ensures consistency between canvas element and tempAnswers state
- Only creates new UUID if element doesn't have one (backward compatibility)

### 4. Backend API (answers.js)
- Modified POST endpoint to accept `id` parameter for UUID-based answer creation
- Maintains backward compatibility with existing answer update logic
- Uses provided UUID when creating new answers

### 5. EditorContext Save Function (editor-context.tsx)
- Updated to use `answerId` from tempAnswers when saving to database
- Removed unnecessary `updateAnswerId` event handling
- Simplified answer saving logic

## Flow Implementation

### When QnA Pair is Added:
1. **Canvas Creation**: Answer textbox gets UUID via `uuidv4()`
2. **React State**: UUID stored in element's `answerId` property
3. **JSON Representation**: `answerId` property contains the UUID
4. **Database Storage**: UUID used as primary key when saving answer

### When User Edits Answer:
1. **Textbox Edit**: Uses element's `answerId` for tempAnswers state
2. **State Update**: UUID maintained in tempAnswers structure
3. **Save Operation**: UUID sent to backend as answer ID
4. **Database**: Answer created/updated with consistent UUID

## Benefits
- **Consistent IDs**: Canvas element `answerId` matches database `answers.id`
- **No ID Conflicts**: UUIDs prevent collision between different answer instances
- **Proper Tracking**: Each answer textbox has unique, persistent identifier
- **Database Integrity**: Foreign key relationships maintained correctly

## Backward Compatibility
- Existing elements without `answerId` will get UUID on first edit
- Old numeric IDs in database remain functional
- Gradual migration to UUID system as users interact with elements

## Testing Recommendations
1. Create new QnA pair and verify UUID is set immediately
2. Edit answer text and confirm UUID persists in tempAnswers
3. Save book and verify database record uses same UUID
4. Load book and confirm answer text displays correctly
5. Test with multiple users on same question