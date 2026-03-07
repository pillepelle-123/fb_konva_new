/**
 * Designer Toolbar
 * Top toolbar with quick actions (Add Image, Add Text, Add Sticker, Save, Generate)
 */

import { Button } from '../../../ui/primitives/button';
import { Image, Type, Smile, Save, Zap, Undo2, Redo2 } from 'lucide-react';
import { Separator } from '../../../ui/primitives/separator';

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
    <div className="border-b border-gray-200 bg-white px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Add items */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddImage}
            title="Add Image"
            className="gap-2"
          >
            <Image size={16} />
            Image
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddText}
            title="Add Text"
            className="gap-2"
          >
            <Type size={16} />
            Text
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddSticker}
            title="Add Sticker"
            className="gap-2"
          >
            <Smile size={16} />
            Sticker
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo (if implemented) */}
          {(onUndo || onRedo) && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo"
              >
                <Undo2 size={16} />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo"
              >
                <Redo2 size={16} />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {isDirty && (
            <p className="text-xs text-amber-600 font-medium">Unsaved changes</p>
          )}

          {/* Save button */}
          <Button
            type="button"
            size="sm"
            variant={isDirty ? 'default' : 'outline'}
            onClick={onSave}
            disabled={isSaving || !isDirty}
            className="gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          {/* Generate button */}
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onGenerate}
            disabled={isGenerating}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Zap size={16} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </div>
  );
}
