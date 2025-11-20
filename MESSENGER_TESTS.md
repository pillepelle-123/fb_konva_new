# Messenger Book-Chat Tests

## Backend
- ✅ Run `POST /api/books` to create a new book and confirm a row is created in `conversations` with `book_id`, `is_group = true`, and owner added in `conversation_participants`.
- ✅ Call `POST /api/books/:bookId/friends` and `POST /api/books/:bookId/collaborators` for a second user and verify the user is added to `conversation_participants` (and `joined_at` reflects the addition time).
- ✅ Execute `DELETE /api/books/:bookId/friends/:friendId` and confirm the participant row is removed.
- ✅ Toggle `/api/books/:bookId/archive` twice and verify the `books.archived` flag and matching `conversations.active` flag switch in sync.
- ✅ Fetch `/api/messenger/books/:bookId/conversation` as an owner/collaborator and ensure the API returns the conversation metadata while adding the requester to the chat.
- ✅ Use `/api/messenger/conversations/:id/users` and `/api/messenger/conversations/:id/users/:userId` to add/remove participants manually (requires requester to be a participant).
- ✅ Confirm `/api/messenger/conversations/:id/messages` only returns rows with `messages.created_at >= conversation_participants.joined_at` for the requesting user.

## Frontend
- ✅ After creating a book, open `/messenger` and verify a entry appears with the “book” badge.
- ✅ Upload a new collaborator via Book Manager → Friends tab and ensure the Messenger conversation now lists that user (plus message input is available).
- ✅ Remove the collaborator and verify the Messenger conversation no longer shows them in the participant list.
- ✅ Send messages in a book chat and ensure profile pictures appear near each bubble; verify left/right alignment matches sender.
- ✅ Archive the book and confirm the conversation list entry shows a “Disabled” button; opening the chat shows the inactive banner and disables the composer.
- ✅ Unarchive the book and verify the conversation automatically becomes active again and the composer is re-enabled.







