# Book and Page Access Locking Concept

## Goal
Prevent concurrent edits that can overwrite changes when multiple users work on the same book. The system must detect potential edit conflicts at page entry time (via URL or page explorer) and notify the later user with an alert dialog. Editing tools that can change the canvas must be disabled for the blocked user.

## Definitions
- User roles: owner, publisher, author.
- Author access levels:
  - pageAccessLevel: form_only | own_page | all_pages
    - form_only: Cannot access editor, only answer form
    - own_page: Can only view and edit their assigned pages
    - all_pages: Can view all pages, but can only edit their assigned pages
  - editorInteractionLevel: no_access | answer_only | full_edit | full_edit_with_settings
- Editor entry: opening the editor route for a book.
- Page entry: any navigation that activates a page (URL page parameter or page explorer click).
- Editor tools: toolbar, tool settings panel, and any action that can modify elements or page background.

## Lock Types
- Book edit lock: indicates a user with global page edit rights is editing.
- Page edit lock: indicates a specific page is being edited by a user who only has rights for assigned/limited pages.

## Base Rules
1. Users with editorInteractionLevel = no_access or pageAccessLevel = form_only never enter the editor and never acquire locks.
2. Users with editorInteractionLevel = answer_only can enter the editor only for answers, but do not acquire page edit locks and do not get editing tools.
3. Owners and publishers are global editors (they can edit all pages).
4. Authors with pageAccessLevel = own_page can only view and edit their assigned pages.
5. Authors with pageAccessLevel = all_pages can view all pages but can only edit their assigned pages.
6. Lock checks happen on page entry, regardless of navigation method.
7. If a lock blocks editing, show an alert dialog and disable all canvas-changing tools.

## Lock Acquisition Policy
- Global editor (owner or publisher):
  - When entering any page, acquire a book edit lock.
  - While the book edit lock is active, no other user may edit any page.
  - The global editor must still respect a page edit lock held by a local editor on a specific page (see conflict resolution).

- Local editor (author with edit rights):
  - When entering a page the user is allowed to edit, acquire a page edit lock for that page.
  - The lock is per page and does not block other pages.

## Conflict Resolution
- If a book edit lock exists by another user:
  - All other users are blocked from editing any page.
  - They can view pages but tool settings and toolbar are disabled.
  - Alert dialog explains that a global editor is currently editing.

- If a page edit lock exists by another user:
  - Only that page is blocked for other users.
  - Other pages remain editable if the user has rights.
  - Alert dialog explains that the page is currently being edited by someone else.

- If both locks exist:
  - Book edit lock has priority except for the page held by the local editor, which must remain blocked for the global editor.
  - Global editor can edit all pages except pages locked by local editors.

## Scenario Matrix

### Scenario 1: Author A (own_page) and Author B (own_page)
- Author A can only view and edit their assigned pages.
- Author B can only view and edit their assigned pages.
- Each author acquires page edit locks on their own pages.
- They can work in parallel on different pages.
- If Author B tries to enter Author A's page, they cannot see it (navigation restricted).

### Scenario 1b: Author A (all_pages) and Author B (all_pages)
- Author A can view all pages but can only edit their assigned pages.
- Author B can view all pages but can only edit their assigned pages.
- Each author acquires page edit locks on their own assigned pages.
- They can work in parallel on different pages.
- If Author A views Author B's assigned page, editing tools are disabled (view-only mode).
- If Author B enters Author A's assigned page while Author A is editing, it is blocked and tools are disabled.

### Scenario 2: Author A and Publisher B
- Publisher B acquires a book edit lock when entering any page.
- Author A is blocked from editing any page while the book edit lock is active.
- Publisher B can edit all pages except the page currently locked by Author A.
- If Author A is editing a page, Publisher B is blocked on that page only and sees an alert.

### Scenario 3: Author A (no_access or form_only) and Publisher B
- Author A does not enter the editor and never acquires locks.
- Publisher B is not restricted by Author A.

## UI Behavior
- On editor load:
  - Evaluate role and access. If no_access or form_only, redirect to answer form.
  - If pageAccessLevel = own_page, restrict page navigation to assigned pages only.
  - If pageAccessLevel = all_pages, allow viewing all pages but restrict editing to assigned pages.
  - Check for existing book/page locks to determine editability.
  - If blocked, show alert dialog and disable canvas tools.

- On page entry:
  - Check if user has view rights for the page (own_page users can only view assigned pages).
  - Check if user has edit rights for the page (all authors can only edit assigned pages).
  - If no edit rights, disable all canvas-changing tools (view-only mode).
  - Check locks. If blocked, show alert dialog and disable tools.
  - If allowed to edit, acquire the corresponding lock.

## Tool Disablement
When blocked for editing (due to locks or insufficient page access rights):
- Toolbar hidden or disabled.
- Tool settings panel hidden or disabled.
- Any action that modifies elements, background, or page settings is disabled.
- Viewing and navigation remain available (within access level restrictions).

## Notes for Implementation Plan
- Lock state must be persisted on the server and exposed via APIs.
- Lock lifecycle should include acquisition, refresh/heartbeat, and release.
- Locks should include user identity, role, page number (if page lock), and a timeout.
