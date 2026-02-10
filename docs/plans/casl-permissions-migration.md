# CASL Permissions Migration Plan

## Goal
Migrate the current decentralized permission system to a centralized, type-safe CASL-based permission system. This will replace scattered `isAuthor && !isOnAssignedPage` checks throughout the codebase with a single source of truth for all permissions.

## Current State Analysis

### Current Permission Variables
- **`userRole`**: `'owner' | 'publisher' | 'author'`
- **`pageAccessLevel`**: `'form_only' | 'own_page' | 'all_pages'`
- **`editorInteractionLevel`**: `'no_access' | 'answer_only' | 'full_edit' | 'full_edit_with_settings'`
- **`isOnAssignedPage`**: Computed as `currentPage?.assignedUserId === user?.id`

### Current Permission Rules
1. **Owners & Publishers**: Can edit all pages (global editors)
2. **Authors with `pageAccessLevel = own_page`**: Can only view and edit their assigned pages
3. **Authors with `pageAccessLevel = all_pages`**: Can view all pages but only edit their assigned pages
4. **Authors with `editorInteractionLevel = answer_only`**: Can only interact with answer elements
5. **Authors with `pageAccessLevel = form_only`**: Cannot access editor at all

### Current Implementation Problems
- **Decentralized**: Permission checks scattered across 20+ components
- **Error-prone**: Easy to forget checks in new components
- **Hard to maintain**: Changes require updates in multiple files
- **Not testable**: No isolated permission testing
- **Inconsistent**: Different components may implement checks differently

### Components with Permission Checks
- `toolbar.tsx` / `tool-button.tsx`: Disables tools for authors not on assigned page
- `tool-settings-panel.tsx`: Hides settings for authors not on assigned page
- `base-canvas-item.tsx`: Controls draggable/interactive properties
- `canvas.tsx`: Controls element creation and manipulation
- Various tool components: Individual permission checks

## CASL Implementation Plan

### Phase 1: Setup & Core Abilities (Prompt 1)

**Task**: Install CASL and create core ability definitions

**Files to create:**
- `client/src/abilities/ability-context.tsx` - React context for abilities
- `client/src/abilities/define-abilities.ts` - Central permission definitions
- `client/src/abilities/types.ts` - TypeScript types for subjects and actions

**Actions to define:**
```typescript
// Actions (verbs)
type Actions = 
  | 'view'      // Can see the resource
  | 'edit'      // Can modify the resource
  | 'create'    // Can create new instances
  | 'delete'    // Can remove the resource
  | 'manage';   // Can do everything

// Subjects (resources)
type Subjects = 
  | 'Page'              // Book pages
  | 'Element'           // Canvas elements
  | 'Tool'              // Editor tools
  | 'ToolSettings'      // Tool settings panel
  | 'BookSettings'      // Book-level settings
  | 'PageSettings'      // Page-level settings
  | 'Answer'            // Answer elements (for answer_only users)
  | 'all';              // All resources
```

**Permission Rules to implement:**
```typescript
// Owner & Publisher (Global Editors)
can('manage', 'all');

// Author with pageAccessLevel = own_page
can('view', 'Page', { assignedUserId: user.id });
can('edit', 'Page', { assignedUserId: user.id });
can('create', 'Element', { page: { assignedUserId: user.id } });
can('edit', 'Element', { page: { assignedUserId: user.id } });
can('delete', 'Element', { page: { assignedUserId: user.id } });
can('use', 'Tool', { page: { assignedUserId: user.id } });
can('view', 'ToolSettings', { page: { assignedUserId: user.id } });

// Author with pageAccessLevel = all_pages
can('view', 'Page'); // All pages
can('edit', 'Page', { assignedUserId: user.id }); // Only assigned
can('create', 'Element', { page: { assignedUserId: user.id } });
can('edit', 'Element', { page: { assignedUserId: user.id } });
can('delete', 'Element', { page: { assignedUserId: user.id } });
can('use', 'Tool', { page: { assignedUserId: user.id } });
can('view', 'ToolSettings', { page: { assignedUserId: user.id } });

// Author with editorInteractionLevel = answer_only
can('view', 'Page');
can('edit', 'Answer', { page: { assignedUserId: user.id } });
cannot('use', 'Tool'); // Except pan/zoom
cannot('view', 'ToolSettings');
```

**Dependencies:**
```bash
npm install @casl/ability @casl/react
```

**Prompt for AI Agent:**
```
Install @casl/ability and @casl/react. Create the following files:

1. client/src/abilities/types.ts
   - Define Actions type: 'view' | 'edit' | 'create' | 'delete' | 'manage' | 'use'
   - Define Subjects type: 'Page' | 'Element' | 'Tool' | 'ToolSettings' | 'BookSettings' | 'PageSettings' | 'Answer' | 'all'
   - Export AppAbility type using PureAbility from @casl/ability

2. client/src/abilities/define-abilities.ts
   - Import defineAbility from @casl/ability
   - Create defineAbilitiesFor(user, currentPage) function
   - Implement permission rules for:
     * Owners & Publishers: can('manage', 'all')
     * Authors with pageAccessLevel = own_page: can only view/edit assigned pages
     * Authors with pageAccessLevel = all_pages: can view all pages, edit only assigned
     * Authors with editorInteractionLevel = answer_only: can only edit answers
   - Export the function

3. client/src/abilities/ability-context.tsx
   - Create AbilityContext using createContext from @casl/react
   - Create AbilityProvider component that wraps children
   - Use useEditor() to get user and currentPage
   - Call defineAbilitiesFor(user, currentPage) and provide via context
   - Export useAbility hook

Reference the permission rules from docs/plans/book-page-access-locking.md
```

### Phase 2: Integrate into Editor Context (Prompt 2)

**Task**: Wrap editor with AbilityProvider and add ability-based helper functions

**Files to modify:**
- `client/src/pages/editor.tsx` - Wrap with AbilityProvider
- `client/src/context/editor-context.tsx` - Add ability helper functions

**Helper functions to add:**
```typescript
// In editor-context.tsx
const canEditCurrentPage = () => ability.can('edit', 'Page', currentPage);
const canUseTools = () => ability.can('use', 'Tool');
const canViewToolSettings = () => ability.can('view', 'ToolSettings');
const canEditElement = (element) => ability.can('edit', 'Element', { page: currentPage });
```

**Prompt for AI Agent:**
```
Integrate CASL abilities into the editor:

1. Modify client/src/pages/editor.tsx:
   - Import AbilityProvider from abilities/ability-context
   - Wrap the editor content with <AbilityProvider>

2. Modify client/src/context/editor-context.tsx:
   - Import useAbility from abilities/ability-context
   - Add helper functions:
     * canEditCurrentPage(): boolean
     * canUseTools(): boolean
     * canViewToolSettings(): boolean
     * canEditElement(element): boolean
     * canCreateElement(): boolean
   - Export these functions from the context

Ensure the AbilityProvider has access to user and currentPage from editor context.
```

### Phase 3: Migrate Toolbar (Prompt 3)

**Task**: Replace permission checks in toolbar with CASL

**Files to modify:**
- `client/src/components/features/editor/toolbar/tool-button.tsx`
- `client/src/components/features/editor/toolbar/toolbar.tsx`

**Current logic to replace:**
```typescript
// OLD
const isDisabled = (isAuthor && id !== 'pan' && !isOnAssignedPage) || ...

// NEW
const ability = useAbility();
const isDisabled = !ability.can('use', 'Tool', { page: currentPage }) && id !== 'pan';
```

**Prompt for AI Agent:**
```
Migrate toolbar permission checks to CASL:

1. In client/src/components/features/editor/toolbar/tool-button.tsx:
   - Import useAbility from abilities/ability-context
   - Replace the isDisabled calculation that checks (isAuthor && !isOnAssignedPage)
   - Use ability.can('use', 'Tool') instead
   - Keep special cases for 'pan', 'zoom', 'select' tools
   - Remove userRole and isOnAssignedPage props if no longer needed

2. In client/src/components/features/editor/toolbar/toolbar.tsx:
   - Update to use CASL checks instead of role-based checks
   - Ensure toolbar visibility is controlled by ability.can('use', 'Tool')

Test that authors can only use tools on their assigned pages.
```

### Phase 4: Migrate Tool Settings Panel (Prompt 4)

**Task**: Replace permission checks in tool settings with CASL

**Files to modify:**
- `client/src/components/features/editor/tool-settings/tool-settings-panel.tsx`

**Current logic to replace:**
```typescript
// OLD
const canShowSettings = !isAuthor || isOnAssignedPage;

// NEW
const ability = useAbility();
const canShowSettings = ability.can('view', 'ToolSettings');
```

**Prompt for AI Agent:**
```
Migrate tool settings panel permission checks to CASL:

1. In client/src/components/features/editor/tool-settings/tool-settings-panel.tsx:
   - Import useAbility from abilities/ability-context
   - Replace canShowSettings calculation with ability.can('view', 'ToolSettings')
   - Remove isAuthor and isOnAssignedPage checks
   - Ensure panel is hidden/disabled when user cannot view settings

Test that authors can only see tool settings on their assigned pages.
```

### Phase 5: Migrate Canvas Interactions (Prompt 5)

**Task**: Replace permission checks in canvas components with CASL

**Files to modify:**
- `client/src/components/features/editor/canvas-items/base-canvas-item.tsx`
- `client/src/components/features/editor/canvas/canvas.tsx`

**Current logic to replace:**
```typescript
// OLD
draggable={interactive && state.activeTool === 'select' && !isMovingGroup && ...}

// NEW
const ability = useAbility();
draggable={interactive && ability.can('edit', 'Element', { page: currentPage }) && ...}
```

**Prompt for AI Agent:**
```
Migrate canvas permission checks to CASL:

1. In client/src/components/features/editor/canvas-items/base-canvas-item.tsx:
   - Import useAbility from abilities/ability-context
   - Replace draggable condition to use ability.can('edit', 'Element')
   - Update interactive conditions to check permissions
   - Remove role-based checks

2. In client/src/components/features/editor/canvas/canvas.tsx:
   - Use ability.can('create', 'Element') for element creation
   - Use ability.can('edit', 'Element') for element modifications
   - Use ability.can('delete', 'Element') for element deletion

Test that authors can only manipulate elements on their assigned pages.
```

### Phase 6: Cleanup & Testing (Prompt 6)

**Task**: Remove old permission variables and add tests

**Files to modify:**
- Remove `isOnAssignedPage` calculations from all components
- Remove `userRole` props where no longer needed
- Add unit tests for ability definitions

**Prompt for AI Agent:**
```
Cleanup and test the CASL migration:

1. Search for remaining instances of:
   - isOnAssignedPage
   - (isAuthor && !isOnAssignedPage)
   - userRole === 'author' (in permission contexts)
   
2. Replace any remaining permission checks with CASL ability checks

3. Create client/src/abilities/__tests__/define-abilities.test.ts:
   - Test owner permissions (should have manage all)
   - Test publisher permissions (should have manage all)
   - Test author with own_page (should only edit assigned pages)
   - Test author with all_pages (should view all, edit only assigned)
   - Test author with answer_only (should only edit answers)

4. Verify all permission scenarios from docs/plans/book-page-access-locking.md work correctly

5. Remove unused permission-related props from component interfaces
```

## Benefits After Migration

1. **Centralized**: All permissions in one file (`define-abilities.ts`)
2. **Type-safe**: TypeScript ensures correct usage
3. **Testable**: Isolated unit tests for permissions
4. **Maintainable**: Changes in one place
5. **Consistent**: Same permission logic everywhere
6. **Documented**: Permissions are self-documenting code

## Rollback Plan

If issues arise:
1. Keep old permission checks commented out during migration
2. Feature flag to switch between old and new system
3. Gradual rollout: migrate one component at a time
4. Full test coverage before removing old code

## Success Criteria

- [ ] All toolbar tools respect CASL permissions
- [ ] Tool settings panel respects CASL permissions
- [ ] Canvas interactions respect CASL permissions
- [ ] No remaining `isOnAssignedPage` checks in codebase
- [ ] All permission scenarios from book-page-access-locking.md work
- [ ] Unit tests pass for all permission rules
- [ ] No regression in existing functionality

## References

- CASL Documentation: https://casl.js.org/v6/en/
- Current permission rules: `docs/plans/book-page-access-locking.md`
- Current implementation: See "Current State Analysis" section above
