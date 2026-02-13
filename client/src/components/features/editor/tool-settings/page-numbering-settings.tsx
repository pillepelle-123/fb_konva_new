import { useState, useEffect, useRef } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { Button } from '../../../ui/primitives/button';
import { Type, Palette, ALargeSmall } from 'lucide-react';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Label } from '../../../ui/primitives/label';
import { Slider } from '../../../ui/primitives/slider';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Separator } from '../../../ui/primitives/separator';
import { FontSelector } from './font-selector';
import { ColorSelector } from './color-selector';
import { FONT_GROUPS, getFontFamily } from '../../../../utils/font-families';
import {
  DEFAULT_PAGE_NUMBERING_SETTINGS,
  type PageNumberingSettings,
} from '../../../../utils/page-number-utils';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';

const getCurrentFontName = (fontFamily: string) => {
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(
      (f) =>
        f.family === fontFamily || f.bold === fontFamily || f.italic === fontFamily
    );
    if (font) return font.name;
  }
  return 'Arial';
};

interface PageNumberingSettingsProps {
  onBack: () => void;
}

export function PageNumberingSettings({ onBack }: PageNumberingSettingsProps) {
  const { state, dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [draft, setDraft] = useState<PageNumberingSettings>(DEFAULT_PAGE_NUMBERING_SETTINGS);
  const [initialDraft, setInitialDraft] = useState<PageNumberingSettings | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive initial state from first page number element found in the book
  useEffect(() => {
    const book = state.currentBook;
    if (!book) return;

    const firstPageNumberEl = book.pages
      .flatMap((p) => p.elements || [])
      .find((el: { isPageNumber?: boolean }) => el.isPageNumber) as
      | {
          fontFamily?: string;
          fontSize?: number;
          fontBold?: boolean;
          fontItalic?: boolean;
          fontColor?: string;
          fontOpacity?: number;
        }
      | undefined;

    const hasAnyPageNumbers = book.pages.some((p) =>
      (p.elements || []).some((el: { isPageNumber?: boolean }) => el.isPageNumber)
    );

    const newDraft: PageNumberingSettings = firstPageNumberEl
      ? {
          enabled: true,
          fontFamily: firstPageNumberEl.fontFamily || 'Arial, sans-serif',
          fontSize: firstPageNumberEl.fontSize ?? DEFAULT_PAGE_NUMBERING_SETTINGS.fontSize,
          fontBold: firstPageNumberEl.fontBold ?? false,
          fontItalic: firstPageNumberEl.fontItalic ?? false,
          fontColor: firstPageNumberEl.fontColor || '#000000',
          fontOpacity: firstPageNumberEl.fontOpacity ?? 1,
        }
      : {
          ...DEFAULT_PAGE_NUMBERING_SETTINGS,
          enabled: hasAnyPageNumbers,
        };

    setDraft(newDraft);
    setInitialDraft(newDraft);
  }, [state.currentBook?.id]);

  const hasChanges =
    initialDraft !== null &&
    (draft.enabled !== initialDraft.enabled ||
      draft.fontFamily !== initialDraft.fontFamily ||
      draft.fontSize !== initialDraft.fontSize ||
      draft.fontBold !== initialDraft.fontBold ||
      draft.fontItalic !== initialDraft.fontItalic ||
      draft.fontColor !== initialDraft.fontColor ||
      Math.abs((draft.fontOpacity ?? 1) - (initialDraft.fontOpacity ?? 1)) > 0.001);

  // Live preview: dispatch preview on every draft change
  useEffect(() => {
    if (initialDraft === null) return;
    dispatch({ type: 'SET_PAGE_NUMBERING_PREVIEW', payload: draft });
  }, [draft, initialDraft, dispatch]);

  // Clear preview on unmount (e.g. when navigating away)
  useEffect(() => {
    return () => {
      dispatch({ type: 'CLEAR_PAGE_NUMBERING_PREVIEW' });
    };
  }, [dispatch]);

  // Clear preview when user clicks outside the settings panel (canvas, toolbar, etc.)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        dispatch({ type: 'CLEAR_PAGE_NUMBERING_PREVIEW' });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  const handleApply = () => {
    dispatch({
      type: 'UPDATE_PAGE_NUMBERING',
      payload: { enabled: draft.enabled, settings: draft },
    });
    dispatch({ type: 'CLEAR_PAGE_NUMBERING_PREVIEW' });
    onBack();
  };

  const handleCancel = () => {
    dispatch({ type: 'CLEAR_PAGE_NUMBERING_PREVIEW' });
    onBack();
  };

  if (showFontSelector) {
    return (
      <div ref={panelRef} className="flex flex-col h-full">
      <FontSelector
        currentFont={getCurrentFontName(draft.fontFamily)}
        isBold={draft.fontBold}
        isItalic={draft.fontItalic}
        onFontSelect={(fontName) => {
          const fontFamily = getFontFamily(fontName, draft.fontBold, draft.fontItalic);
          setDraft((prev) => ({ ...prev, fontFamily }));
          setShowFontSelector(false);
        }}
        onBack={() => setShowFontSelector(false)}
      />
      </div>
    );
  }

  if (showColorSelector) {
    return (
      <div ref={panelRef} className="flex flex-col h-full">
      <ColorSelector
        value={draft.fontColor}
        onChange={(color) => setDraft((prev) => ({ ...prev, fontColor: color || '#000000' }))}
        opacity={draft.fontOpacity}
        onOpacityChange={(opacity) => setDraft((prev) => ({ ...prev, fontOpacity: opacity }))}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setShowColorSelector(false)}
        showOpacitySlider={true}
      />
      </div>
    );
  }

  return (
    <div ref={panelRef} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="page-numbers-enabled"
            checked={draft.enabled}
            onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, enabled: Boolean(checked) }))}
          />
          <Label htmlFor="page-numbers-enabled" variant="xs" className="text-sm font-medium cursor-pointer">
            Show Page Numbers
          </Label>
        </div>

        {draft.enabled && (
          <>
            <Separator />
            <div>
              <div className="flex gap-2">
                <Tooltip content="Bold" side="left">
                  <Button
                    variant={draft.fontBold ? 'default' : 'outline'}
                    size="xxs"
                    onClick={() => setDraft((prev) => ({ ...prev, fontBold: !prev.fontBold }))}
                    className="px-3 flex-shrink-0"
                  >
                    <strong>B</strong>
                  </Button>
                </Tooltip>
                <Tooltip content="Italic" side="left">
                  <Button
                    variant={draft.fontItalic ? 'default' : 'outline'}
                    size="xxs"
                    onClick={() => setDraft((prev) => ({ ...prev, fontItalic: !prev.fontItalic }))}
                    className="px-3 flex-shrink-0"
                  >
                    <em>I</em>
                  </Button>
                </Tooltip>
                <div className="flex-1">
                  <Tooltip content={`Font: ${getCurrentFontName(draft.fontFamily)}`} side="left">
                    <Button
                      variant="outline"
                      size="xxs"
                      onClick={() => setShowFontSelector(true)}
                      className="w-full justify-start"
                      style={{ fontFamily: draft.fontFamily }}
                    >
                      <Type className="h-4 w-4 mr-2" />
                      <span className="truncate">{getCurrentFontName(draft.fontFamily)}</span>
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="flex flex-row gap-2 py-2 w-full">
              <Tooltip content="Font Size" side="left">
                <ALargeSmall className="w-5 h-5 flex-shrink-0" />
              </Tooltip>
              <div className="flex-1 min-w-0">
                <Slider
                  label="Font Size"
                  value={actualToCommon(draft.fontSize)}
                  displayValue={actualToCommon(draft.fontSize)}
                  onChange={(value) => setDraft((prev) => ({ ...prev, fontSize: commonToActual(value) }))}
                  min={COMMON_FONT_SIZE_RANGE.min}
                  max={COMMON_FONT_SIZE_RANGE.max}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Tooltip content="Font Color" side="left">
                <Button
                  variant="outline"
                  size="xxs"
                  onClick={() => setShowColorSelector(true)}
                  className="w-full"
                >
                  <Palette className="w-4 mr-2" />
                  <div
                    className="w-4 h-4 mr-2 rounded border border-border"
                    style={{ backgroundColor: draft.fontColor }}
                  />
                  Font Color
                </Button>
              </Tooltip>
            </div>

            <div className="flex flex-row gap-2 py-2 w-full">
              <Tooltip content="Font Opacity" side="left" fullWidth={true}>
                <Slider
                  label="Font Opacity"
                  value={Math.round((draft.fontOpacity ?? 1) * 100)}
                  displayValue={Math.round((draft.fontOpacity ?? 1) * 100)}
                  onChange={(value) => setDraft((prev) => ({ ...prev, fontOpacity: value / 100 }))}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  hasLabel={false}
                />
              </Tooltip>
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 bg-background border-t p-2">
        <div className="flex gap-2">
          <Button variant="outline" size="xs" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button variant="default" size="xs" onClick={handleApply} className="flex-1" disabled={!hasChanges}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
