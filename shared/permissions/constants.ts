/**
 * Shared permission constants for client and server.
 * Enum-like values for validation and iteration.
 */

import type { BookRole, PageAccessLevel, EditorInteractionLevel } from './types';

export const BOOK_ROLES: readonly BookRole[] = [
  'owner',
  'publisher',
  'author',
] as const;

export const PAGE_ACCESS_LEVELS: readonly PageAccessLevel[] = [
  'form_only',
  'own_page',
  'all_pages',
] as const;

export const EDITOR_INTERACTION_LEVELS: readonly EditorInteractionLevel[] = [
  'no_access',
  'answer_only',
  'full_edit',
  'full_edit_with_settings',
] as const;

export const DEFAULT_PAGE_ACCESS_LEVEL: PageAccessLevel = 'own_page';

export const DEFAULT_EDITOR_INTERACTION_LEVEL: EditorInteractionLevel =
  'full_edit';

export const PUBLISHER_PAGE_ACCESS_LEVEL: PageAccessLevel = 'all_pages';

export const PUBLISHER_EDITOR_INTERACTION_LEVEL: EditorInteractionLevel =
  'full_edit_with_settings';
