/**
 * Tests for ability-builder.js
 * Run with: node --test server/services/__tests__/ability-builder.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { subject } = require('@casl/ability');
const { buildAbilityFor } = require('../ability-builder');

describe('buildAbilityFor', () => {
  describe('owner and publisher', () => {
    it('owner can manage all', () => {
      const ability = buildAbilityFor(
        1,
        'owner',
        'all_pages',
        'full_edit_with_settings',
        []
      );
      assert.strictEqual(ability.can('manage', 'all'), true);
      assert.strictEqual(ability.can('edit', 'Page'), true);
      assert.strictEqual(ability.can('use', 'Tool'), true);
    });

    it('publisher can manage all', () => {
      const ability = buildAbilityFor(
        1,
        'publisher',
        'all_pages',
        'full_edit_with_settings',
        []
      );
      assert.strictEqual(ability.can('manage', 'all'), true);
    });
  });

  describe('author with own_page', () => {
    it('can only view and edit assigned pages', () => {
      const ability = buildAbilityFor(
        42,
        'author',
        'own_page',
        'full_edit',
        [1, 2, 3],
        { assignedUserId: 42, pageType: 'content' }
      );
      const assignedPage = { assignedUserId: 42 };
      const unassignedPage = { assignedUserId: 99 };

      assert.strictEqual(ability.can('view', subject('Page', assignedPage)), true);
      assert.strictEqual(ability.can('edit', subject('Page', assignedPage)), true);
      assert.strictEqual(ability.can('view', subject('Page', unassignedPage)), false);
      assert.strictEqual(ability.can('edit', subject('Page', unassignedPage)), false);
    });
  });

  describe('author with all_pages', () => {
    it('can view all pages', () => {
      const ability = buildAbilityFor(
        42,
        'author',
        'all_pages',
        'full_edit',
        [1, 2]
      );
      assert.strictEqual(ability.can('view', 'Page'), true);
    });
  });

  describe('author with answer_only', () => {
    it('can view pages but cannot view ToolSettings', () => {
      const ability = buildAbilityFor(
        42,
        'author',
        'all_pages',
        'answer_only',
        [1]
      );
      assert.strictEqual(ability.can('view', 'Page'), true);
      assert.strictEqual(ability.can('view', 'ToolSettings'), false);
    });
  });

  describe('author with form_only', () => {
    it('has no permissions', () => {
      const ability = buildAbilityFor(
        42,
        'author',
        'form_only',
        'full_edit',
        []
      );
      assert.strictEqual(ability.can('view', 'Page'), false);
    });
  });

  describe('author with no_access', () => {
    it('has no permissions', () => {
      const ability = buildAbilityFor(
        42,
        'author',
        'all_pages',
        'no_access',
        []
      );
      assert.strictEqual(ability.can('view', 'Page'), false);
    });
  });

  describe('cover page restrictions', () => {
    it('publisher on front-cover retains manage all', () => {
      const ability = buildAbilityFor(
        42,
        'publisher',
        'all_pages',
        'full_edit_with_settings',
        [],
        { assignedUserId: 42, pageType: 'front-cover' }
      );
      assert.strictEqual(ability.can('manage', 'all'), true);
    });
  });
});
