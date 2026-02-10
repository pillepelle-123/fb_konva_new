import { useMemo, useState } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Palette, Type, ALargeSmall } from 'lucide-react';
import { Slider } from '../../../ui/primitives/slider';
import { Label } from '../../../ui/primitives/label';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Separator } from '../../../ui/primitives/separator';
import { SettingsFormFooter } from './settings-form-footer';
import { FontSelector } from './font-selector';
import { ColorSelector } from './color-selector';
import { useEditor } from '../../../../context/editor-context';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getFontFamily as getFontFamilyByName, FONT_GROUPS } from '../../../../utils/font-families';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';

const getCurrentFontName = (fontFamily: string) => {
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.family === fontFamily || f.bold === fontFamily || f.italic === fontFamily);
    if (font) return font.name;
  }
  return 'Arial';
};

interface StickerSettingsFormProps {
  element: any;
  updateElementSettingLocal: (key: string, value: any) => void;
  setShowColorSelector: (value: string | null) => void;
  hasChanges?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}

export function StickerSettingsForm({
  element,
  updateElementSettingLocal,
  setShowColorSelector,
  hasChanges,
  onSave,
  onDiscard
}: StickerSettingsFormProps) {
  const { state } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [localShowColorSelector, setLocalShowColorSelector] = useState<string | null>(null);
  const shouldShowFooter =
    hasChanges !== undefined && Boolean(onSave) && Boolean(onDiscard);
  const stickerOpacity = element.imageOpacity !== undefined ? element.imageOpacity : 1;

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
  const activeTheme = pageTheme || bookTheme || 'default';
  const stickerTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text', undefined);

  const hasStickerText = Boolean(element.stickerText && element.stickerText.trim().length > 0);
  const isStickerTextEnabled = element.stickerTextEnabled ?? hasStickerText;

  const computedTextStyle = useMemo(() => ({
    fontSize: element.stickerTextSettings?.fontSize ?? stickerTextDefaults?.textSettings?.fontSize ?? stickerTextDefaults?.fontSize ?? 50,
    fontFamily: element.stickerTextSettings?.fontFamily ?? stickerTextDefaults?.textSettings?.fontFamily ?? stickerTextDefaults?.fontFamily ?? 'Arial, sans-serif',
    fontBold: element.stickerTextSettings?.fontBold ?? stickerTextDefaults?.textSettings?.fontBold ?? false,
    fontItalic: element.stickerTextSettings?.fontItalic ?? stickerTextDefaults?.textSettings?.fontItalic ?? false,
    fontColor: element.stickerTextSettings?.fontColor ?? stickerTextDefaults?.textSettings?.fontColor ?? stickerTextDefaults?.fontColor ?? '#1f2937',
    fontOpacity: element.stickerTextSettings?.fontOpacity ?? stickerTextDefaults?.textSettings?.fontOpacity ?? 1
  }), [element.stickerTextSettings, stickerTextDefaults]);

  const updateStickerTextSetting = (key: string, value: any) => {
    updateElementSettingLocal('stickerTextSettings', {
      ...(element.stickerTextSettings || {}),
      [key]: value
    });
  };

  const handleTextEnabledChange = (checked: boolean) => {
    updateElementSettingLocal('stickerTextEnabled', checked);
    if (!checked) {
      updateElementSettingLocal('stickerText', undefined);
      updateElementSettingLocal('stickerTextOffset', undefined);
      return;
    }
    if (!element.stickerText) {
      updateElementSettingLocal('stickerText', '');
    }
    if (!element.stickerTextSettings) {
      updateElementSettingLocal('stickerTextSettings', {
        fontSize: computedTextStyle.fontSize,
        fontFamily: computedTextStyle.fontFamily,
        fontBold: computedTextStyle.fontBold,
        fontItalic: computedTextStyle.fontItalic,
        fontColor: computedTextStyle.fontColor,
        fontOpacity: computedTextStyle.fontOpacity
      });
    }
  };

  if (showFontSelector) {
    return (
      <FontSelector
        currentFont={computedTextStyle.fontFamily}
        isBold={computedTextStyle.fontBold}
        isItalic={computedTextStyle.fontItalic}
        onFontSelect={(fontName) => {
          const fontFamily = getFontFamilyByName(fontName, computedTextStyle.fontBold, computedTextStyle.fontItalic);
          updateStickerTextSetting('fontFamily', fontFamily);
        }}
        onBack={() => setShowFontSelector(false)}
        element={element}
        state={state}
      />
    );
  }

  if (localShowColorSelector) {
    return (
      <ColorSelector
        value={computedTextStyle.fontColor}
        onChange={(color) => updateStickerTextSetting('fontColor', color)}
        opacity={computedTextStyle.fontOpacity}
        onOpacityChange={(opacity) => updateStickerTextSetting('fontOpacity', opacity)}
        favoriteColors={favoriteStrokeColors}
        onAddFavorite={addFavoriteStrokeColor}
        onRemoveFavorite={removeFavoriteStrokeColor}
        onBack={() => setLocalShowColorSelector(null)}
        showOpacitySlider={true}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
      <div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowColorSelector('element-sticker-color')}
          className="w-full"
        >
          <Palette className="h-4 w-4 mr-2" />
          <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: element.stickerColor || '#000000' }} />
          Sticker Color
        </Button>
      </div>

      <Slider
        label="Opacity"
        value={Math.round(stickerOpacity * 100)}
        displayValue={Math.round(stickerOpacity * 100)}
        onChange={(value) => updateElementSettingLocal('imageOpacity', value / 100)}
        min={0}
        max={100}
        step={5}
        unit="%"
      />
      <Separator />
      <div className="space-y-2">
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox checked={isStickerTextEnabled} onCheckedChange={(checked) => handleTextEnabledChange(Boolean(checked))} />
          Sticker Text
        </Label>
        <input
          type="text"
          placeholder="Sticker text"
          value={element.stickerText || ''}
          onChange={(e) => updateElementSettingLocal('stickerText', e.target.value)}
          disabled={!isStickerTextEnabled}
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm disabled:bg-gray-100"
        />
        {isStickerTextEnabled && hasStickerText && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              updateElementSettingLocal('stickerTextEnabled', false);
              updateElementSettingLocal('stickerText', undefined);
              updateElementSettingLocal('stickerTextOffset', undefined);
            }}
            className="w-full"
          >
            Remove Text
          </Button>
        )}
      </div>

      {isStickerTextEnabled && (
        <>
          <div>
            <div className="flex gap-2">
              <Button
                variant={computedTextStyle.fontBold ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateStickerTextSetting('fontBold', !computedTextStyle.fontBold)}
                className="px-3"
              >
                <strong>B</strong>
              </Button>
              <Button
                variant={computedTextStyle.fontItalic ? 'default' : 'outline'}
                size="xs"
                onClick={() => updateStickerTextSetting('fontItalic', !computedTextStyle.fontItalic)}
                className="px-3"
              >
                <em>I</em>
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowFontSelector(true)}
                className="flex-1 justify-start"
                style={{ fontFamily: computedTextStyle.fontFamily }}
              >
                <Type className="h-4 w-4 mr-2" />
                <span className="truncate">{getCurrentFontName(computedTextStyle.fontFamily)}</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-row gap-2 py-2 w-full">
            <div className="flex-1">
              <div className="flex flex-row gap-2">
                <ALargeSmall className="w-5 h-5" />
                <Slider
                  label="Font Size"
                  value={actualToCommon(computedTextStyle.fontSize || 50)}
                  displayValue={actualToCommon(computedTextStyle.fontSize || 50)}
                  onChange={(value) => updateStickerTextSetting('fontSize', commonToActual(value))}
                  min={COMMON_FONT_SIZE_RANGE.min}
                  max={COMMON_FONT_SIZE_RANGE.max}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setLocalShowColorSelector('sticker-text-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedTextStyle.fontColor }} />
              Font Color
            </Button>
          </div>
          <div>
            <Slider
              label="Font Opacity"
              value={Math.round((computedTextStyle.fontOpacity ?? 1) * 100)}
              displayValue={Math.round((computedTextStyle.fontOpacity ?? 1) * 100)}
              onChange={(value) => updateStickerTextSetting('fontOpacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
            />
          </div>
        </>
      )}
      </div>
      {shouldShowFooter && (
        <SettingsFormFooter
          hasChanges={hasChanges ?? false}
          onSave={onSave!}
          onDiscard={onDiscard!}
        />
      )}
    </div>
  );
}