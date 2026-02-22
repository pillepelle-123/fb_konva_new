/**
 * Shared permission constants (CommonJS for server).
 * Keep in sync with constants.ts.
 */

module.exports = {
  BOOK_ROLES: ['owner', 'publisher', 'author'],
  PAGE_ACCESS_LEVELS: ['form_only', 'own_page', 'all_pages'],
  EDITOR_INTERACTION_LEVELS: [
    'no_access',
    'answer_only',
    'full_edit',
    'full_edit_with_settings',
  ],
  DEFAULT_PAGE_ACCESS_LEVEL: 'own_page',
  DEFAULT_EDITOR_INTERACTION_LEVEL: 'full_edit',
  PUBLISHER_PAGE_ACCESS_LEVEL: 'all_pages',
  PUBLISHER_EDITOR_INTERACTION_LEVEL: 'full_edit_with_settings',
};
