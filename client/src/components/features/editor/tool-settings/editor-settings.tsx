import { useEditor } from '../../../../context/editor-context';
import { Checkbox } from '../../../ui/primitives/checkbox';

export function EditorSettings() {
  const { state, dispatch } = useEditor();

  // Read lockElements directly from state to ensure we get the latest value
  const lockElements = Boolean(state.editorSettings?.editor?.lockElements);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="lock-elements"
            checked={lockElements}
            onCheckedChange={(checked) => {
              // Ensure we only accept boolean true, not 'indeterminate' or other values
              const lockValue = checked === true;
              dispatch({
                type: 'UPDATE_EDITOR_SETTINGS',
                payload: {
                  category: 'editor',
                  settings: { lockElements: lockValue }
                }
              });
            }}
          />
          <label
            htmlFor="lock-elements"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            Lock Elements
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          When enabled, all users will be unable to move canvas elements.
        </p>
      </div>
    </div>
  );
}