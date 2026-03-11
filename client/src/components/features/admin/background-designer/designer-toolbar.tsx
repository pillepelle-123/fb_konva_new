/**
 * Designer Toolbar
 * Top toolbar with quick actions (Add Image, Add Text, Add Sticker, Save, Generate)
 */

import { Button } from '../../../ui/primitives/button';
import { Image, Type, Smile, Save, Zap, Undo2, Redo2 } from 'lucide-react';

interface DesignerToolbarProps {
  onAddImage: () => void;
  onAddText: () => void;
  onAddSticker: () => void;
  onSave: () => void;
  onGenerate: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
  isDirty?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function DesignerToolbar({
  onAddImage,
  onAddText,
  onAddSticker,
  onSave,
  onGenerate,
  onUndo,
  onRedo,
  isSaving = false,
  isGenerating = false,
  isDirty = false,
  canUndo = false,
  canRedo = false,
}: DesignerToolbarProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Add items */}
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onAddImage}
            title="Add Image"
            className="gap-1.5"
          >
            <Image size={14} />
            Image
          </Button>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onAddText}
            title="Add Text"
            className="gap-1.5"
          >
            <Type size={14} />
            Text
          </Button>

          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onAddSticker}
            title="Add Sticker"
            className="gap-1.5"
          >
            <Smile size={14} />
            Sticker
          </Button>

          <div className="mx-0.5 h-5 w-px bg-gray-200" aria-hidden="true" />

          {/* Undo/Redo (if implemented) */}
          {(onUndo || onRedo) && (
            <>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo"
              >
                <Undo2 size={14} />
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo"
              >
                <Redo2 size={14} />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status indicator */}
          {isDirty && (
            <p className="text-[11px] text-amber-600 font-medium">Unsaved changes</p>
          )}

          {/* Save button */}
          <Button
            type="button"
            size="xs"
            variant={isDirty ? 'default' : 'outline'}
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="gap-1.5"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          {/* Generate button */}
          <Button
            type="button"
            size="xs"
            variant="default"
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
          >
            <Zap size={14} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
