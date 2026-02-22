import { describe, it, expect } from 'vitest';
import { defineAbilitiesFor } from '../define-abilities';
import { subject } from '@casl/ability';

describe('defineAbilitiesFor', () => {
  describe('owner and publisher', () => {
    it('owner can manage all', () => {
      const ability = defineAbilitiesFor({
        id: 1,
        role: 'owner',
        pageAccessLevel: 'all_pages',
        editorInteractionLevel: 'full_edit_with_settings',
      });
      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('edit', 'Page')).toBe(true);
      expect(ability.can('use', 'Tool')).toBe(true);
      expect(ability.can('view', 'ToolSettings')).toBe(true);
    });

    it('publisher can manage all', () => {
      const ability = defineAbilitiesFor({
        id: 1,
        role: 'publisher',
        pageAccessLevel: 'all_pages',
        editorInteractionLevel: 'full_edit_with_settings',
      });
      expect(ability.can('manage', 'all')).toBe(true);
      expect(ability.can('edit', 'Page')).toBe(true);
    });
  });

  describe('author with own_page', () => {
    it('can only view and edit assigned pages', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'author',
          pageAccessLevel: 'own_page',
          editorInteractionLevel: 'full_edit',
        },
        { assignedUserId: 42, pageType: 'content' }
      );
      const assignedPage = { assignedUserId: 42 };
      const unassignedPage = { assignedUserId: 99 };

      expect(ability.can('view', subject('Page', assignedPage))).toBe(true);
      expect(ability.can('edit', subject('Page', assignedPage))).toBe(true);
      expect(ability.can('view', subject('Page', unassignedPage))).toBe(false);
      expect(ability.can('edit', subject('Page', unassignedPage))).toBe(false);
    });

    it('can create and edit elements on assigned page', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'author',
          pageAccessLevel: 'own_page',
          editorInteractionLevel: 'full_edit',
        },
        null
      );
      const pageData = { assignedUserId: 42 };
      expect(ability.can('create', subject('Element', { page: pageData }))).toBe(true);
      expect(ability.can('edit', subject('Element', { page: pageData }))).toBe(true);
      expect(ability.can('use', subject('Tool', { page: pageData }))).toBe(true);
    });
  });

  describe('author with all_pages', () => {
    it('can view all pages but only edit assigned', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'author',
          pageAccessLevel: 'all_pages',
          editorInteractionLevel: 'full_edit',
        },
        null
      );
      const assignedPage = { assignedUserId: 42 };
      const unassignedPage = { assignedUserId: 99 };

      expect(ability.can('view', subject('Page', {}))).toBe(true);
      expect(ability.can('edit', subject('Page', assignedPage))).toBe(true);
      expect(ability.can('edit', subject('Page', unassignedPage))).toBe(false);
    });
  });

  describe('author with answer_only', () => {
    it('can view pages and edit answers, cannot view ToolSettings', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'author',
          pageAccessLevel: 'all_pages',
          editorInteractionLevel: 'answer_only',
        },
        null
      );
      const pageData = { assignedUserId: 42 };

      expect(ability.can('view', subject('Page', {}))).toBe(true);
      expect(ability.can('edit', subject('Answer', { page: pageData }))).toBe(true);
      expect(ability.can('view', subject('ToolSettings', {}))).toBe(false);
    });
  });

  describe('author with form_only', () => {
    it('has no permissions', () => {
      const ability = defineAbilitiesFor({
        id: 42,
        role: 'author',
        pageAccessLevel: 'form_only',
        editorInteractionLevel: 'full_edit',
      });
      expect(ability.can('view', 'Page')).toBe(false);
      expect(ability.can('edit', 'Page')).toBe(false);
    });
  });

  describe('author with no_access', () => {
    it('has no permissions', () => {
      const ability = defineAbilitiesFor({
        id: 42,
        role: 'author',
        pageAccessLevel: 'all_pages',
        editorInteractionLevel: 'no_access',
      });
      expect(ability.can('view', 'Page')).toBe(false);
    });
  });

  describe('cover page restrictions', () => {
    it('cannot create or edit qna/qna2 on cover pages', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'publisher',
          pageAccessLevel: 'all_pages',
          editorInteractionLevel: 'full_edit_with_settings',
        },
        { assignedUserId: 42, pageType: 'front-cover' }
      );
      const pageData = { assignedUserId: 42 };

      expect(ability.can('create', subject('Element', { page: pageData, textType: 'qna' }))).toBe(false);
      expect(ability.can('create', subject('Element', { page: pageData, textType: 'qna2' }))).toBe(false);
      expect(ability.can('edit', subject('Element', { page: pageData, textType: 'qna' }))).toBe(false);
    });
  });

  describe('full_edit qna restriction', () => {
    it('author with full_edit cannot create qna elements', () => {
      const ability = defineAbilitiesFor(
        {
          id: 42,
          role: 'author',
          pageAccessLevel: 'own_page',
          editorInteractionLevel: 'full_edit',
        },
        { assignedUserId: 42, pageType: 'content' }
      );
      const pageData = { assignedUserId: 42 };

      expect(ability.can('create', subject('Element', { page: pageData, textType: 'qna' }))).toBe(false);
    });
  });

  describe('null user', () => {
    it('has no permissions', () => {
      const ability = defineAbilitiesFor(null);
      expect(ability.can('view', 'Page')).toBe(false);
      expect(ability.can('manage', 'all')).toBe(false);
    });
  });
});
