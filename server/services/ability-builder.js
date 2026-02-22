/**
 * Builds CASL ability for a user's book permissions.
 * Mirrors client/src/abilities/define-abilities.ts logic.
 */

const { defineAbility } = require('@casl/ability');

/**
 * @param {number|null} userId
 * @param {string} bookRole - 'owner' | 'publisher' | 'author'
 * @param {string} pageAccessLevel - 'form_only' | 'own_page' | 'all_pages'
 * @param {string} editorInteractionLevel - 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings'
 * @param {number[]} assignedPages - Page numbers for authors
 * @param {{ assignedUserId?: number|null; pageType?: string|null }} [currentPage]
 * @returns {import('@casl/ability').PureAbility}
 */
function buildAbilityFor(
  userId,
  bookRole,
  pageAccessLevel,
  editorInteractionLevel,
  assignedPages = [],
  currentPage = null
) {
  return defineAbility((can, cannot) => {
    if (bookRole === 'owner' || bookRole === 'publisher') {
      can('manage', 'all');
      const isCoverPage =
        currentPage?.pageType === 'front-cover' ||
        currentPage?.pageType === 'back-cover';
      if (isCoverPage) {
        cannot('create', 'Element', { textType: 'qna' });
        cannot('create', 'Element', { textType: 'qna2' });
        cannot('edit', 'Element', { textType: 'qna' });
        cannot('edit', 'Element', { textType: 'qna2' });
        cannot('delete', 'Element', { textType: 'qna' });
        cannot('delete', 'Element', { textType: 'qna2' });
      }
      return;
    }

    if (bookRole !== 'author') {
      return;
    }

    if (
      editorInteractionLevel === 'no_access' ||
      pageAccessLevel === 'form_only'
    ) {
      return;
    }

    const assignedPageCondition = userId ? { assignedUserId: userId } : null;
    const assignedElementCondition = userId
      ? { 'page.assignedUserId': userId }
      : null;

    if (editorInteractionLevel === 'answer_only') {
      can('view', 'Page');

      if (assignedElementCondition) {
        can('edit', 'Answer', assignedElementCondition);
      }

      can('use', 'Tool', { toolId: 'pan' });
      can('use', 'Tool', { toolId: 'zoom' });
      can('use', 'Tool', { toolId: 'select' });
      cannot('use', 'Tool');
      cannot('view', 'ToolSettings');
      return;
    }

    if (pageAccessLevel === 'own_page') {
      if (assignedPageCondition) {
        can('view', 'Page', assignedPageCondition);
        can('edit', 'Page', assignedPageCondition);
      }

      if (assignedElementCondition) {
        can('create', 'Element', assignedElementCondition);
        can('edit', 'Element', assignedElementCondition);
        can('delete', 'Element', assignedElementCondition);
        can('use', 'Tool', assignedElementCondition);
        can('view', 'ToolSettings', assignedElementCondition);
      }

      if (
        editorInteractionLevel === 'full_edit_with_settings' &&
        assignedElementCondition
      ) {
        can('view', 'PageSettings', assignedElementCondition);
      }

      if (
        editorInteractionLevel === 'full_edit' ||
        editorInteractionLevel === 'full_edit_with_settings'
      ) {
        cannot('use', 'Tool', { toolId: 'qna' });
        cannot('create', 'Element', { textType: 'qna' });
        cannot('edit', 'Element', { textType: 'qna' });
        cannot('delete', 'Element', { textType: 'qna' });
      }

      return;
    }

    if (pageAccessLevel === 'all_pages') {
      can('view', 'Page');

      if (assignedPageCondition) {
        can('edit', 'Page', assignedPageCondition);
      }

      if (assignedElementCondition) {
        can('create', 'Element', assignedElementCondition);
        can('edit', 'Element', assignedElementCondition);
        can('delete', 'Element', assignedElementCondition);
        can('use', 'Tool', assignedElementCondition);
        can('view', 'ToolSettings', assignedElementCondition);
      }

      if (
        editorInteractionLevel === 'full_edit_with_settings' &&
        assignedElementCondition
      ) {
        can('view', 'PageSettings', assignedElementCondition);
      }
    }

    if (
      editorInteractionLevel === 'full_edit' ||
      editorInteractionLevel === 'full_edit_with_settings'
    ) {
      cannot('use', 'Tool', { toolId: 'qna' });
      cannot('create', 'Element', { textType: 'qna' });
      cannot('edit', 'Element', { textType: 'qna' });
      cannot('delete', 'Element', { textType: 'qna' });
    }

    const isCoverPage =
      currentPage?.pageType === 'front-cover' ||
      currentPage?.pageType === 'back-cover';
    if (isCoverPage) {
      cannot('create', 'Element', { textType: 'qna' });
      cannot('create', 'Element', { textType: 'qna2' });
      cannot('edit', 'Element', { textType: 'qna' });
      cannot('edit', 'Element', { textType: 'qna2' });
      cannot('delete', 'Element', { textType: 'qna' });
      cannot('delete', 'Element', { textType: 'qna2' });
    }
  });
}

module.exports = { buildAbilityFor };
