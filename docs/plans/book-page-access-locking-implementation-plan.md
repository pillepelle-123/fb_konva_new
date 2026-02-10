# Book/Page Access Locking - Implementation Plan

## Purpose
Translate the locking concept into actionable API, server, and client changes. This plan assumes a server-backed lock store with timeouts and heartbeats, and client-side enforcement at page entry.

## Scope
- Server: lock storage, acquisition/release, conflict rules, heartbeat.
- Client: lock checks on editor load and page entry, alert dialog, UI disablement, and lock lifecycle.
- No database schema changes are required if locks are stored in memory or cache, but persistence is recommended for multi-node deployments.

## API Design

### Endpoints
1. `POST /books/:bookId/locks/claim`
   - Body:
     - `pageNumber?: number`
     - `lockType: 'book' | 'page'`
     - `requestedByRole: 'owner' | 'publisher' | 'author'`
   - Response:
     - `status: 'granted' | 'blocked'`
     - `lock?: { id, bookId, pageNumber, lockType, userId, userName, role, expiresAt }`
     - `reason?: 'book_locked' | 'page_locked' | 'no_edit_rights'`

2. `POST /books/:bookId/locks/release`
   - Body:
     - `pageNumber?: number`
     - `lockType: 'book' | 'page'`
   - Response: `{ status: 'released' }`

3. `POST /books/:bookId/locks/heartbeat`
   - Body:
     - `lockId`
   - Response:
     - `status: 'ok' | 'expired'`

4. `GET /books/:bookId/locks`
   - Response: list of active locks

### Lock Rules (Server)
- Book lock conflicts with any other book lock.
- Book lock blocks all page locks from other users.
- Page lock conflicts only with the same page.
- Global editors (owner/publisher) are not allowed to claim a page lock if another user holds it; they must treat it as blocked for that page.
- Local editors can claim page locks only for pages they can edit (assigned pages).

## Server Implementation

### Storage
- In-memory map keyed by `bookId` with lock entries. Each lock has:
  - `id`, `bookId`, `pageNumber` (optional), `lockType`, `userId`, `userName`, `role`, `expiresAt`.
- TTL expiration (default: 60-90 seconds) with cleanup on access.
- Optional: move to Redis for multi-node deployments.

### Middleware/Helpers
- `cleanupExpiredLocks(bookId)`
- `getActiveLocks(bookId)`
- `isBlocked(request)` returns reason and blocking lock.

### Edge Cases
- If heartbeat fails or client disconnects, lock expires.
- On editor unload, client should attempt release, but expiration is fallback.

## Client Implementation

### New Client Service
- `apiService.claimLock(bookId, lockType, pageNumber?)`
- `apiService.releaseLock(bookId, lockType, pageNumber?)`
- `apiService.heartbeatLock(lockId)`
- `apiService.getLocks(bookId)`

### State Additions (Editor Context)
- `activeLockId?: string`
- `activeLockType?: 'book' | 'page'`
- `activeLockPage?: number`
- `lockBlocked?: { reason, lockedBy, lockType, pageNumber }`
- `isEditLocked: boolean`

### Editor Load Flow
1. Resolve permissions.
2. If no_access or form_only: redirect.
3. Determine default page entry.
4. Attempt lock claim for page entry:
   - owner/publisher => try book lock.
   - author => try page lock if page is assigned.
5. If blocked, show alert dialog and set `isEditLocked = true`.

### Page Entry Flow
- On any page change:
  1. Check view rights.
  2. Check edit rights.
  3. If no edit rights: set `isEditLocked = true` (view-only).
  4. If edit rights:
     - Release previous page lock (if any).
     - Attempt to claim new lock (page lock or book lock).
     - If blocked: show alert and set `isEditLocked = true`.

### Heartbeat
- Start heartbeat when a lock is granted.
- Interval: 20-30 seconds.
- If heartbeat expires, set `isEditLocked = true` and show alert.

### UI Enforcement
- `Toolbar` hidden or disabled when `isEditLocked`.
- `ToolSettingsPanel` hidden or disabled when `isEditLocked`.
- Any canvas-editing action checks `isEditLocked` to prevent state updates.
- Alert dialog uses existing `alert-dialog.tsx`.

## Integration Points
- Page entry: page explorer click + URL param handling in editor page.
- Save flow: no change needed if lock enforcement is correct.
- Editor context: central place to store lock state and enforce in `canEditCanvas()`.

## Testing Plan
- Unit: lock rules for conflicts.
- Integration: multi-user scenario simulations for scenarios 1-3.
- UI: verify alert dialog appears and editing tools are disabled.

## Rollout Plan
1. Add server endpoints with in-memory storage.
2. Add client service functions.
3. Add editor-context state and logic.
4. Hook into editor load + page entry.
5. Add UI disablement and alerts.
6. Validate scenario matrix.
