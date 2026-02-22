import { useState } from 'react';
import { Button } from '../../../ui/primitives/button';
import { Palette, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, ALargeSmall, Rows4, Rows3, Rows2, SquareRoundCorner, PanelTopBottomDashed } from 'lucide-react';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getMinActualStrokeWidth, commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { getFontFamily as getFontFamilyByName } from '../../../../utils/font-families';
import { FONT_GROUPS } from '../../../../utils/font-families';
import { ThemeSelect } from '../../../../utils/theme-options';
import { FontSelector } from './font-selector';
import { ColorSelector } from './color-selector';
import { SlotSelector } from './slot-selector';
import { DEFAULT_PALETTE_PARTS } from '../../../../data/templates/color-palettes';
import type { PaletteColorSlot } from '../../../../utils/sandbox-utils';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { ThemeSettingsRenderer } from './theme-settings-renderer';
import { SettingsFormFooter } from './settings-form-footer';
import { Tooltip } from '../../../ui';

const getCurrentFontName = (fontFamily: string) => {
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.family === fontFamily || f.bold === fontFamily || f.italic === fontFamily);
    if (font) return font.name;
  }
  return "Arial";
};

interface FreeTextSettingsFormProps {
  element: any;
  state: any;
  currentStyle: any;
  updateSetting: (key: string, value: any) => void;
  setShowFontSelector: (show: boolean) => void;
  setShowColorSelector: (type: string | null) => void;
  showFontSelector?: boolean;
  showColorSelector?: string | null;
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSandboxMode?: boolean;
  sandbox?: import('../../../../context/sandbox-context').SandboxContextValue;
}

export function FreeTextSettingsForm({
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector,
  showFontSelector,
  showColorSelector,
  hasChanges,
  onSave,
  onDiscard,
  isSandboxMode = false,
  sandbox
}: FreeTextSettingsFormProps) {
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [localShowColorSelector, setLocalShowColorSelector] = useState<string | null>(null);

  const getTextStyle = () => {
    const tStyle = element.textSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme || 'default';
    const freeTextDefaults = getGlobalThemeDefaults(activeTheme, 'free_text', undefined);

    return {
      fontSize: tStyle.fontSize || freeTextDefaults?.textSettings?.fontSize || freeTextDefaults?.fontSize || 50,
      fontFamily: tStyle.fontFamily || freeTextDefaults?.textSettings?.fontFamily || freeTextDefaults?.fontFamily || 'Arial, sans-serif',
      fontBold: tStyle.fontBold ?? freeTextDefaults?.textSettings?.fontBold ?? false,
      fontItalic: tStyle.fontItalic ?? freeTextDefaults?.textSettings?.fontItalic ?? false,
      fontColor: tStyle.fontColor || freeTextDefaults?.textSettings?.fontColor || freeTextDefaults?.fontColor || '#1f2937',
      fontOpacity: tStyle.fontOpacity ?? freeTextDefaults?.textSettings?.fontOpacity ?? 1,
      align: tStyle.align || element.format?.textAlign || freeTextDefaults?.textSettings?.align || freeTextDefaults?.align || 'left',
      paragraphSpacing: tStyle.paragraphSpacing || freeTextDefaults?.textSettings?.paragraphSpacing || 'medium',
      ruledLines: tStyle.ruledLines ?? freeTextDefaults?.textSettings?.ruledLines ?? false,
      ruledLinesColor: tStyle.ruledLinesColor || freeTextDefaults?.textSettings?.ruledLinesColor || '#1f2937',
      ruledLinesOpacity: tStyle.ruledLinesOpacity ?? freeTextDefaults?.textSettings?.ruledLinesOpacity ?? 1,
      ruledLinesWidth: tStyle.ruledLinesWidth ?? freeTextDefaults?.textSettings?.ruledLinesWidth ?? 0.8,
      ruledLinesTheme: tStyle.ruledLinesTheme || freeTextDefaults?.textSettings?.ruledLinesTheme || 'rough',
      borderEnabled: tStyle.borderEnabled ?? freeTextDefaults?.textSettings?.border?.enabled ?? false,
      borderColor: tStyle.borderColor || freeTextDefaults?.textSettings?.border?.borderColor || '#000000',
      borderOpacity: tStyle.borderOpacity ?? freeTextDefaults?.textSettings?.border?.borderOpacity ?? 1,
      borderWidth: tStyle.borderWidth ?? freeTextDefaults?.textSettings?.border?.borderWidth ?? 1,
      borderTheme: tStyle.borderTheme || freeTextDefaults?.textSettings?.border?.borderTheme || 'default',
      backgroundEnabled: tStyle.backgroundEnabled ?? freeTextDefaults?.textSettings?.background?.enabled ?? false,
      backgroundColor: tStyle.backgroundColor || freeTextDefaults?.textSettings?.background?.backgroundColor || '#ffffff',
      backgroundOpacity: tStyle.backgroundOpacity ?? freeTextDefaults?.textSettings?.background?.backgroundOpacity ?? 1,
      cornerRadius: tStyle.cornerRadius ?? freeTextDefaults?.cornerRadius ?? 0,
      padding: tStyle.padding ?? freeTextDefaults?.textSettings?.padding ?? freeTextDefaults?.padding ?? 8
    };
  };

  const computedCurrentStyle = getTextStyle();

  const updateTextSetting = (key: string, value: any) => {
    const textSettingsUpdates = { ...element.textSettings, [key]: value };
    updateSetting('textSettings', textSettingsUpdates);
    if (key === 'align') {
      updateSetting('format', { ...element.format, textAlign: value });
      updateSetting('align', value);
    }
  };

  if (showFontSelector) {
    return (
      <FontSelector
        currentFont={computedCurrentStyle.fontFamily}
        isBold={computedCurrentStyle.fontBold}
        isItalic={computedCurrentStyle.fontItalic}
        onFontSelect={(fontName) => {
          const fontFamily = getFontFamilyByName(fontName, false, false);
          updateTextSetting('fontFamily', fontFamily);
        }}
        onBack={() => setShowFontSelector(false)}
        element={element}
        state={state}
      />
    );
  }

  if (localShowColorSelector) {
    const getColorValue = () => {
      switch (localShowColorSelector) {
        case 'element-text-color': return computedCurrentStyle.fontColor;
        case 'element-border-color': return computedCurrentStyle.borderColor;
        case 'element-background-color': return computedCurrentStyle.backgroundColor;
        case 'element-ruled-lines-color': return computedCurrentStyle.ruledLinesColor;
        default: return '#1f2937';
      }
    };

    const getElementOpacityValue = () => {
      switch (localShowColorSelector) {
        case 'element-text-color': return computedCurrentStyle.fontOpacity;
        case 'element-border-color': return computedCurrentStyle.borderOpacity;
        case 'element-background-color': return computedCurrentStyle.backgroundOpacity;
        case 'element-ruled-lines-color': return computedCurrentStyle.ruledLinesOpacity;
        default: return 1;
      }
    };

    const handleElementOpacityChange = (opacity: number) => {
      switch (localShowColorSelector) {
        case 'element-text-color': updateTextSetting('fontOpacity', opacity); break;
        case 'element-border-color': updateTextSetting('borderOpacity', opacity); break;
        case 'element-background-color': updateTextSetting('backgroundOpacity', opacity); break;
        case 'element-ruled-lines-color': updateTextSetting('ruledLinesOpacity', opacity); break;
      }
    };

    const handleElementColorChange = (color: string) => {
      switch (localShowColorSelector) {
        case 'element-text-color': updateTextSetting('fontColor', color); break;
        case 'element-border-color': updateTextSetting('borderColor', color); break;
        case 'element-background-color': updateTextSetting('backgroundColor', color); break;
        case 'element-ruled-lines-color': updateTextSetting('ruledLinesColor', color); break;
      }
    };

    return (
      <ColorSelector
        value={getColorValue()}
        onChange={handleElementColorChange}
        opacity={getElementOpacityValue()}
        onOpacityChange={handleElementOpacityChange}
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
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        <div>
          <div className="flex gap-2">
            <Tooltip content="Bold" side="left">
              <Button variant={computedCurrentStyle.fontBold ? 'default' : 'outline'} size="xxs" onClick={() => updateTextSetting('fontBold', !computedCurrentStyle.fontBold)} className="px-3 flex-shrink-0">
                <strong>B</strong>
              </Button>
            </Tooltip>
            <Tooltip content="Italic" side="left">
              <Button variant={computedCurrentStyle.fontItalic ? 'default' : 'outline'} size="xxs" onClick={() => updateTextSetting('fontItalic', !computedCurrentStyle.fontItalic)} className="px-3 flex-shrink-0">
                <em>I</em>
              </Button>
            </Tooltip>
            <div className="flex-1">
              <Tooltip content={`Font: ${getCurrentFontName(computedCurrentStyle.fontFamily)}`} side="left">
                <Button variant="outline" size="xxs" onClick={() => setShowFontSelector(true)} className="w-full justify-start" style={{ fontFamily: computedCurrentStyle.fontFamily }}>
                  <Type className="h-4 w-4 mr-2" />
                  <span className="truncate">{getCurrentFontName(computedCurrentStyle.fontFamily)}</span>
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
            <Slider label="Font Size" value={actualToCommon(computedCurrentStyle.fontSize || 50)} displayValue={actualToCommon(computedCurrentStyle.fontSize || 50)} onChange={(value) => updateTextSetting('fontSize', commonToActual(value))} min={COMMON_FONT_SIZE_RANGE.min} max={COMMON_FONT_SIZE_RANGE.max} step={1} className="w-full" />
          </div>
        </div>

        <div>
          {isSandboxMode && sandbox ? (
            <SlotSelector
              label="Font Color"
              value={(sandbox.getPartSlot(element.id, 'freeTextText') ?? DEFAULT_PALETTE_PARTS.freeTextText) as PaletteColorSlot}
              onChange={(slot) => {
                sandbox.setPartSlotOverride(element.id, 'freeTextText', slot);
                updateTextSetting('fontColor', sandbox.getColorForSlot(slot));
              }}
              slotColors={sandbox.state.sandboxColors}
            />
          ) : (
            <Tooltip content="Font Color" side="left">
              <Button variant="outline" size="xxs" onClick={() => setLocalShowColorSelector('element-text-color')} className="w-full">
                <Palette className="w-4 mr-2" />
                <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedCurrentStyle.fontColor }} />
                Font Color
              </Button>
            </Tooltip>
          )}
        </div>

        <div className="flex flex-row gap-2 py-2 w-full">
          <Tooltip content="Font Opacity" side="left" fullWidth={true}>
            <Slider label="Font Opacity" value={Math.round((computedCurrentStyle.fontOpacity ?? 1) * 100)} displayValue={Math.round((computedCurrentStyle.fontOpacity ?? 1) * 100)} onChange={(value) => updateTextSetting('fontOpacity', value / 100)} min={0} max={100} step={5} unit="%" hasLabel={false} />
          </Tooltip>
        </div>

        <Separator/>

        <div className='flex flex-row gap-3'>
          <div className="flex-[3_1_0%] min-w-0 py-2">
            <Tooltip content="Paragraph Spacing" side="left" fullWidth={true}>
              <ButtonGroup className="flex w-full flex-row">
              <Button variant={computedCurrentStyle.paragraphSpacing === 'small' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('paragraphSpacing', 'small')} className="px-1 h-6 flex-1">
                <Rows4 className="h-3 w-3" />
              </Button>
              <Button variant={computedCurrentStyle.paragraphSpacing === 'medium' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('paragraphSpacing', 'medium')} className="px-1 h-6 flex-1">
                <Rows3 className="h-3 w-3" />
              </Button>
              <Button variant={computedCurrentStyle.paragraphSpacing === 'large' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('paragraphSpacing', 'large')} className="px-1 h-6 flex-1">
                <Rows2 className="h-3 w-3" />
              </Button>
            </ButtonGroup>
            </Tooltip>
          </div>
          <div className="flex-[4_1_0%] min-w-0 py-2">
            <Tooltip content="Text Align" side="left" fullWidth={true}>
              <ButtonGroup className="flex w-full flex-row">
              <Button variant={computedCurrentStyle.align === 'left' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('align', 'left')} className="px-1 h-6 flex-1">
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button variant={computedCurrentStyle.align === 'center' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('align', 'center')} className="px-1 h-6 flex-1">
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button variant={computedCurrentStyle.align === 'right' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('align', 'right')} className="px-1 h-6 flex-1">
                <AlignRight className="h-3 w-3" />
              </Button>
              <Button variant={computedCurrentStyle.align === 'justify' ? 'default' : 'outline'} size="xs" onClick={() => updateTextSetting('align', 'justify')} className="px-1 h-6 flex-1">
                <AlignJustify className="h-3 w-3" />
              </Button>
            </ButtonGroup>
            </Tooltip>
          </div>
        </div>

        <Separator/>

        <div className='py-2'>
          <Tooltip content="Ruled Lines" side="left">
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox checked={computedCurrentStyle.ruledLines} onCheckedChange={(checked) => updateTextSetting('ruledLines', checked)} />
              Ruled Lines
            </Label>
          </Tooltip>
        </div>

        {computedCurrentStyle.ruledLines && (
          <IndentedSection>
            <div className="min-w-0">
              <Tooltip content="Line Width" side="left" fullWidth={true}>
                <Slider label="Line Width" value={computedCurrentStyle.ruledLinesWidth ?? 0.8} onChange={(value) => updateTextSetting('ruledLinesWidth', value)} min={1} max={30} step={0.3} className="w-full" />
              </Tooltip>
            </div>
            <div>
              <Tooltip content="Ruled Lines Theme" side="left">
                <ThemeSelect value={computedCurrentStyle.ruledLinesTheme} onChange={(value) => updateTextSetting('ruledLinesTheme', value)} />
              </Tooltip>
            </div>
            <ThemeSettingsRenderer
              element={element}
              theme={computedCurrentStyle.ruledLinesTheme}
              updateSetting={(key, value) => updateTextSetting(key, value)}
            />
            <div>
              {isSandboxMode && sandbox ? (
                <SlotSelector
                  label="Line Color"
                  value={(sandbox.getPartSlot(element.id, 'freeTextRuledLines') ?? DEFAULT_PALETTE_PARTS.freeTextRuledLines) as PaletteColorSlot}
                  onChange={(slot) => {
                    sandbox.setPartSlotOverride(element.id, 'freeTextRuledLines', slot);
                    updateTextSetting('ruledLinesColor', sandbox.getColorForSlot(slot));
                  }}
                  slotColors={sandbox.state.sandboxColors}
                />
              ) : (
                <Tooltip content="Line Color" side="left">
                  <Button variant="outline" size="xxs" onClick={() => setLocalShowColorSelector('element-ruled-lines-color')} className="w-full">
                    <Palette className="w-4 mr-2" />
                    <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedCurrentStyle.ruledLinesColor }} />
                    Line Color
                  </Button>
                </Tooltip>
              )}
            </div>
            <div className="min-w-0">
              <Tooltip content="Line Opacity" side="left" fullWidth={true}>
                <Slider label="Line Opacity" value={Math.round((computedCurrentStyle.ruledLinesOpacity ?? 1) * 100)} displayValue={Math.round((computedCurrentStyle.ruledLinesOpacity ?? 1) * 100)} onChange={(value) => updateTextSetting('ruledLinesOpacity', value / 100)} min={0} max={100} step={5} unit="%" hasLabel={false} className="w-full" />
              </Tooltip>
            </div>
          </IndentedSection>
        )}

        <Separator/>

        <div className='py-2'>
          <Tooltip content="Border" side="left">
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox checked={computedCurrentStyle.borderEnabled} onCheckedChange={(checked) => updateTextSetting('borderEnabled', checked)} />
              Border
            </Label>
          </Tooltip>
        </div>

        {computedCurrentStyle.borderEnabled && (
          <IndentedSection>
            <div className="min-w-0">
              <Tooltip content="Border Width" side="left" fullWidth={true}>
                <Slider label="Border Width" value={actualToCommonStrokeWidth(computedCurrentStyle.borderWidth, computedCurrentStyle.borderTheme)} onChange={(value) => {
                  const actualWidth = commonToActualStrokeWidth(value, computedCurrentStyle.borderTheme);
                  updateTextSetting('borderWidth', actualWidth);
                }} min={1} max={getMaxCommonWidth()} step={1} className="w-full" />
              </Tooltip>
            </div>
            <div>
              <Tooltip content="Border Theme" side="left">
                <ThemeSelect value={computedCurrentStyle.borderTheme} onChange={(value) => updateTextSetting('borderTheme', value)} />
              </Tooltip>
            </div>
            <ThemeSettingsRenderer
              element={element}
              theme={computedCurrentStyle.borderTheme}
              updateSetting={(key, value) => updateTextSetting(key, value)}
            />
            <div>
              {isSandboxMode && sandbox ? (
                <SlotSelector
                  label="Border Color"
                  value={(sandbox.getPartSlot(element.id, 'freeTextBorder') ?? DEFAULT_PALETTE_PARTS.freeTextBorder) as PaletteColorSlot}
                  onChange={(slot) => {
                    sandbox.setPartSlotOverride(element.id, 'freeTextBorder', slot);
                    updateTextSetting('borderColor', sandbox.getColorForSlot(slot));
                  }}
                  slotColors={sandbox.state.sandboxColors}
                />
              ) : (
                <Tooltip content="Border Color" side="left">
                  <Button variant="outline" size="xxs" onClick={() => setLocalShowColorSelector('element-border-color')} className="w-full">
                    <Palette className="w-4 mr-2" />
                    <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedCurrentStyle.borderColor }} />
                    Border Color
                  </Button>
                </Tooltip>
              )}
            </div>
            <div className="min-w-0">
              <Tooltip content="Border Opacity" side="left" fullWidth={true}>
                <Slider label="Border Opacity" value={Math.round((computedCurrentStyle.borderOpacity ?? 1) * 100)} displayValue={Math.round((computedCurrentStyle.borderOpacity ?? 1) * 100)} onChange={(value) => updateTextSetting('borderOpacity', value / 100)} min={0} max={100} step={5} unit="%" hasLabel={false} className="w-full" />
              </Tooltip>
            </div>
          </IndentedSection>
        )}

        <div>
          <Tooltip content="Background" side="left">
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox checked={computedCurrentStyle.backgroundEnabled} onCheckedChange={(checked) => updateTextSetting('backgroundEnabled', checked)} />
              Background
            </Label>
          </Tooltip>
        </div>

        {computedCurrentStyle.backgroundEnabled && (
          <IndentedSection>
            <div>
              {isSandboxMode && sandbox ? (
                <SlotSelector
                  label="Background Color"
                  value={(sandbox.getPartSlot(element.id, 'freeTextBackground') ?? DEFAULT_PALETTE_PARTS.freeTextBackground) as PaletteColorSlot}
                  onChange={(slot) => {
                    sandbox.setPartSlotOverride(element.id, 'freeTextBackground', slot);
                    updateTextSetting('backgroundColor', sandbox.getColorForSlot(slot));
                  }}
                  slotColors={sandbox.state.sandboxColors}
                />
              ) : (
                <Tooltip content="Background Color" side="left">
                  <Button variant="outline" size="xxs" onClick={() => setLocalShowColorSelector('element-background-color')} className="w-full">
                    <Palette className="w-4 mr-2" />
                    <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedCurrentStyle.backgroundColor }} />
                    Background Color
                  </Button>
                </Tooltip>
              )}
            </div>
            <div className="min-w-0">
              <Tooltip content="Background Opacity" side="left" fullWidth={true}>
                <Slider label="Background Opacity" value={Math.round((computedCurrentStyle.backgroundOpacity ?? 1) * 100)} displayValue={Math.round((computedCurrentStyle.backgroundOpacity ?? 1) * 100)} onChange={(value) => updateTextSetting('backgroundOpacity', value / 100)} min={5} max={100} step={5} unit="%" hasLabel={false} className="w-full" />
              </Tooltip>
            </div>
          </IndentedSection>
        )}

        <div className="flex flex-row gap-2 py-2 w-full">
          <Tooltip content="Corner Radius" side="left">
            <SquareRoundCorner className="w-5 h-5 flex-shrink-0" />
          </Tooltip>
          <div className="flex-1 min-w-0">
            <Slider label="Corner Radius" value={actualToCommonRadius(computedCurrentStyle.cornerRadius)} onChange={(value) => updateTextSetting('cornerRadius', commonToActualRadius(value))} min={COMMON_CORNER_RADIUS_RANGE.min} max={COMMON_CORNER_RADIUS_RANGE.max} step={1} className="w-full" />
          </div>
        </div>

        <div className="flex flex-row gap-2 py-2 w-full">
          <Tooltip content="Padding" side="left">
            <PanelTopBottomDashed className="w-5 h-5 flex-shrink-0" />
          </Tooltip>
          <div className="flex-1 min-w-0">
            <Slider label="Padding" value={computedCurrentStyle.padding} onChange={(value) => updateTextSetting('padding', value)} min={0} max={100} step={1} className="w-full" />
          </div>
        </div>
      </div>
      <SettingsFormFooter hasChanges={hasChanges} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
