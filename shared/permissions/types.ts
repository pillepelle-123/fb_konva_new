/**
 * Shared permission types for client and server.
 * Used by CASL ability definitions and permission middleware.
 */

export type BookRole = 'owner' | 'publisher' | 'author';

export type PageAccessLevel = 'form_only' | 'own_page' | 'all_pages';

export type EditorInteractionLevel =
  | 'no_access'
  | 'answer_only'
  | 'full_edit'
  | 'full_edit_with_settings';

export type AbilityUser = {
  id?: number;
  role?: BookRole | null;
  pageAccessLevel?: PageAccessLevel;
  editorInteractionLevel?: EditorInteractionLevel;
};

export type AbilityPage = {
  assignedUserId?: number | null;
  pageType?: string | null;
} | null;
