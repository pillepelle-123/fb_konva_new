# Settings Form Save/Discard Implementation

## Overview
Settings forms now have Save/Discard functionality similar to Theme/Layout/Palette selectors. All changes are previewed live on canvas, but only saved to history when user clicks "Save Changes".

## Implementation Status

### ✅ Completed
1. **Hook**: `useSettingsFormState.ts` - Manages original element state and change detection
2. **Footer Component**: `settings-form-footer.tsx` - Save/Discard buttons
3. **Reducer Action**: `RESTORE_ELEMENT_STATE` - Restores element to original state

### 🔄 To Implement
Integrate hook and footer into these settings forms:
- `qna-settings-form.tsx`
- `shape-settings-form.tsx`
- `image-settings-form.tsx`
- `sticker-settings-form.tsx`
- `free-text-settings-form.tsx` (if exists)

## Integration Steps

### 1. Import Hook and Footer
```typescript
import { useSettingsFormState } from '../../../../hooks/useSettingsFormState';
import { SettingsFormFooter } from './settings-form-footer';
```

### 2. Add Hook to Component
```typescript
export function QnASettingsForm({ element, ... }: Props) {
  const { hasChanges, handleSave, handleDiscard } = useSettingsFormState(element);
  
  // ... existing code
}
```

### 3. Wrap Return with Flex Container
```typescript
return (
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto">
      {/* Existing settings controls */}
    </div>
    
    <SettingsFormFooter
      hasChanges={hasChanges}
      onSave={handleSave}
      onDiscard={handleDiscard}
    />
  </div>
);
```

### 4. Auto-Discard on Deselection
In `tool-settings-content.tsx`, add useEffect to handle auto-discard when user clicks away:

```typescript
// In tool-settings-content.tsx
useEffect(() => {
  // When selection changes, discard unsaved changes
  return () => {
    if (hasUnsavedChanges) {
      handleDiscard();
    }
  };
}, [state.selectedElementIds]);
```

## Behavior

### Live Preview
- All changes are immediately visible on canvas (existing behavior)
- Changes use `UPDATE_ELEMENT_PRESERVE_SELECTION` action (no history save)

### Save Changes
- Saves current element state to history
- Updates original element reference
- Resets `hasChanges` to false
- Button only enabled when `hasChanges === true`

### Discard Changes
- Restores element to original state using `RESTORE_ELEMENT_STATE` action
- Reverts all changes made since form was opened
- Resets `hasChanges` to false
- Button only enabled when `hasChanges === true`

### Auto-Discard
- When user clicks outside settings form (selects different element or tool)
- Changes are automatically discarded without confirmation
- Consistent with Theme/Layout/Palette selector behavior

## Notes

- **No Confirmation Dialog**: Auto-discard happens silently (as per user requirement)
- **Grouped Elements**: Common save button for all elements in group
- **Multi-Selection**: Common save button for all selected elements
- **History**: Only one history entry per "Save Changes" click (not per input change)

## Example: QnA Settings Form

```typescript
export function QnASettingsForm({ element, ... }: Props) {
  const { hasChanges, handleSave, handleDiscard } = useSettingsFormState(element);
  
  // ... existing code ...
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {/* Font controls */}
        {renderFontControls()}
        
        {/* Border controls */}
        {/* Background controls */}
        {/* etc. */}
      </div>
      
      <SettingsFormFooter
        hasChanges={hasChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
```

## Testing Checklist

- [ ] Changes preview live on canvas
- [ ] Save button disabled when no changes
- [ ] Save button enabled after making changes
- [ ] Clicking Save creates one history entry
- [ ] Clicking Discard reverts all changes
- [ ] Clicking outside form auto-discards changes
- [ ] Undo/Redo works correctly with saved changes
- [ ] Works with grouped elements
- [ ] Works with multi-selection
