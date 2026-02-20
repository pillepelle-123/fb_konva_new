import { defineAbility } from '@casl/ability';
import type { AppAbility } from './types';

export type AbilityUser = {
  id?: number;
  role?: 'owner' | 'publisher' | 'author' | null;
  pageAccessLevel?: 'form_only' | 'own_page' | 'all_pages';
  editorInteractionLevel?: 'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings';
};

export type AbilityPage = {
  assignedUserId?: number | null;
  pageType?: string | null;
} | null;

export const defineAbilitiesFor = (user: AbilityUser | null, currentPage?: AbilityPage): AppAbility =>
  defineAbility((can, cannot) => {
    const userRole = user?.role ?? null;
    const pageAccessLevel = user?.pageAccessLevel;
    const editorInteractionLevel = user?.editorInteractionLevel;
    const userId = user?.id;

    if (userRole === 'owner' || userRole === 'publisher') {
      can('manage', 'all');
      return;
    }

    if (userRole !== 'author') {
      return;
    }

    if (editorInteractionLevel === 'no_access' || pageAccessLevel === 'form_only') {
      return;
    }

    const assignedPageCondition = userId ? { assignedUserId: userId } : null;
    const assignedElementCondition = userId ? { 'page.assignedUserId': userId } : null;

    if (editorInteractionLevel === 'answer_only') {
      can('view', 'Page');

      if (assignedElementCondition) {
        can('edit', 'Answer', assignedElementCondition);
      }

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

      if (editorInteractionLevel === 'full_edit_with_settings' && assignedElementCondition) {
        can('view', 'PageSettings', assignedElementCondition);
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

      if (editorInteractionLevel === 'full_edit_with_settings' && assignedElementCondition) {
        can('view', 'PageSettings', assignedElementCondition);
      }
    }

    if (editorInteractionLevel === 'full_edit' || editorInteractionLevel === 'full_edit_with_settings') {
      cannot('use', 'Tool', { toolId: 'qna' });
      cannot('create', 'Element', { textType: 'qna' });
      cannot('edit', 'Element', { textType: 'qna' });
      cannot('delete', 'Element', { textType: 'qna' });
    }

    // Front/back cover: no qna or qna2 elements
    const isCoverPage = currentPage?.pageType === 'front-cover' || currentPage?.pageType === 'back-cover';
    if (isCoverPage) {
      cannot('create', 'Element', { textType: 'qna' });
      cannot('create', 'Element', { textType: 'qna2' });
      cannot('edit', 'Element', { textType: 'qna' });
      cannot('edit', 'Element', { textType: 'qna2' });
      cannot('delete', 'Element', { textType: 'qna' });
      cannot('delete', 'Element', { textType: 'qna2' });
    }
  });
