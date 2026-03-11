/**
 * Designer Header
 * Merged header + toolbar row with navigation, title and quick actions.
 */

import { ArrowLeft, Image, Type, Smile, Save, Settings, Zap, Undo2, Redo2 } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';

interface DesignerHeaderProps {
  title: string;
  isDirty?: boolean;
  onBack: () => void;
  onAddImage: () => void;
  onAddText: () => void;
  onAddSticker: () => void;
  onOpenCanvasSettings: () => void;
  onSave: () => void;
  onGenerate: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function DesignerHeader({
  title,
  isDirty = false,
  onBack,
  onAddImage,
  onAddText,
  onAddSticker,
  onOpenCanvasSettings,
  onSave,
  onGenerate,
  onUndo,
  onRedo,
  isSaving = false,
  isGenerating = false,
  canUndo = false,
  canRedo = false,
}: DesignerHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onBack}
            className="gap-1.5"
          >
            <ArrowLeft size={14} />
            Back
          </Button>

          <h1 className="text-lg font-semibold text-gray-900 leading-none">{title}</h1>
          {isDirty && <span className="text-xs text-amber-600 font-medium leading-none">*</span>}

          <div className="mx-0.5 h-5 w-px bg-gray-200" aria-hidden="true" />

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

          {(onUndo || onRedo) && (
            <>
              <div className="mx-0.5 h-5 w-px bg-gray-200" aria-hidden="true" />
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
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={onOpenCanvasSettings}
            className="gap-1.5"
            title="Canvas Settings"
          >
            <Settings size={14} />
            Settings
          </Button>

          {isDirty && (
            <p className="text-[11px] text-amber-600 font-medium">Unsaved changes</p>
          )}

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