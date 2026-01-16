# Dead Code Review - Kategorisierung

## ✅ SICHER ZU LÖSCHEN - Offensichtlich ungenutzt

### Nur index.ts Dateien (Re-Exports ohne eigene Logik)
- `client/src/components/features/books/index.ts` ❓ (prüfen ob wirklich leer)
- `client/src/components/features/friends/index.ts`
- `client/src/components/features/images/index.ts`
- `client/src/components/features/questions/index.ts`
- `client/src/components/features/users/index.ts`
- `client/src/components/features/index.ts`
- `client/src/components/index.ts`
- `client/src/components/layouts/index.ts`
- `client/src/components/pdf-renderer/index.ts`
- `client/src/components/shared/cards/index.ts`
- `client/src/components/shared/forms/index.ts`
- `client/src/components/ui/feedback/index.ts`
- `client/src/components/ui/layout/index.ts`
- `client/src/components/ui/overlays/index.ts`

### Test-bezogen (sollte durch Excludes herausgefiltert werden)
- `client/src/test-setup/canvas-setup.ts` ⚠️ (NICHT löschen - für Tests)

### Alte Theme-Systeme
- `client/src/utils/themes-client-zigzag.ts` (erscheint veraltet)
- `client/src/utils/themes.ts` (erscheint veraltet)
- `client/src/data/theme-palette-mapping.ts` (erscheint veraltet)

### Alte Template-Komponenten
- `client/src/components/templates/template-card.tsx`
- `client/src/components/templates/template-preview.tsx`
- `client/src/components/templates/template-selector-step.tsx`

### Alte Book-Komponenten
- `client/src/components/features/books/book-list.tsx`
- `client/src/components/features/books/page-user-content.tsx`
- `client/src/components/features/books/questions-answers-manager.tsx`

### Alte/Ungenutzte UI-Komponenten
- `client/src/components/ui/composites/avatar.tsx` ⚠️ (könnte noch verwendet werden)
- `client/src/components/ui/composites/page-navigation.tsx`
- `client/src/components/ui/overlays/alert-dialog.tsx`
- `client/src/components/ui/overlays/sheet.tsx`
- `client/src/components/ui/primitives/color-picker.tsx`
- `client/src/components/ui/primitives/skeleton.tsx`
- `client/src/components/ui/primitives/toggle.tsx`

### Shared Utils (möglicherweise alt)
- `shared/utils/color-utils.js`
- `shared/utils/constants.js`

### Utils (erscheinen veraltet)
- `client/src/utils/book-creation-utils.ts`
- `client/src/utils/color-contrast-checker.ts`
- `client/src/utils/magic-wand.ts`
- `client/src/utils/performance-metrics.ts`
- `client/src/utils/performance-optimization.ts`
- `client/src/utils/template-validation.ts`
- `client/src/utils/thumbnail-generator.ts`

### Hooks
- `client/src/hooks/useCanvasExport.ts`

### Presets
- `client/src/data/presets/brush-presets.ts`
- `client/src/data/presets/index.ts`
- `client/src/data/presets/shape-presets.ts`
- `client/src/data/presets/textbox-presets.ts`

### Friends
- `client/src/components/features/friends/friends-book-assign-card.tsx`
- `client/src/components/features/friends/select-friend-dialog.tsx`

### Users
- `client/src/components/features/users/profile-dialog.tsx`

### Cards
- `client/src/components/shared/cards/question-selection-card.tsx`
- `client/src/components/shared/cards/stacked-avatar-group.tsx`

### Book Creation Shared
- `client/src/components/features/books/shared/step-grid.tsx`
- `client/src/components/features/books/shared/step-layouts.ts`
- `client/src/components/features/books/shared/use-step-layout.ts`

---

## ⚠️ VORSICHTIG - Könnte noch verwendet werden

### Admin-System (verwendet durch AdminApp.tsx, aber nicht durch Hauptrouting erfasst)
**NICHT LÖSCHEN** - Diese Dateien werden durch lazy loading in AdminApp.tsx verwendet:
- Alle `client/src/admin/**/*` Dateien

### Editor-Komponenten (könnten durch dynamische Importe verwendet werden)
**PRÜFEN** - Diese werden möglicherweise vom Editor verwendet:
- `client/src/components/features/editor/book-export-modal.tsx`
- `client/src/components/features/editor/floating-action-buttons.tsx`
- `client/src/components/features/editor/pdf-export-modal.tsx`
- `client/src/components/features/editor/quill-editor-container.tsx`
- `client/src/components/features/editor/template-selector.tsx`

### Editor Canvas Items
- `client/src/components/features/editor/canvas-items/image-placeholder.tsx`
- `client/src/components/features/editor/canvas-items/shared-text-renderer.tsx`

### Editor Canvas
- `client/src/components/features/editor/canvas/canvas-helpers.tsx`
- `client/src/components/features/editor/canvas/components.ts`
- `client/src/components/features/editor/canvas/safety-margin-rectangle.tsx`
- `client/src/components/features/editor/canvas/hooks/useCanvasMouseEvents.ts`

### Editor Bar (gesamte Editor-Bar)
- Alle `client/src/components/features/editor/editor-bar/*`

### Editor Preview
- Alle `client/src/components/features/editor/preview/*`

### Editor Templates
- `client/src/components/features/editor/templates/template-palette.tsx`
- `client/src/components/features/editor/templates/wizard-palette-selector.tsx`

### Editor Toolbar
- Alle `client/src/components/features/editor/toolbar/*`

---

## 🔍 STRATEGIE

1. **Phase 1**: Lösche nur die als "SICHER" kategorisierten Dateien
2. **Phase 2**: Prüfe Editor-Komponenten durch manuelle Code-Inspektion
3. **Phase 3**: Bereinige Index-Dateien
4. **Phase 4**: Finaler Test-Lauf
