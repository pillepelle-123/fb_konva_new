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
import { getFontFamily } from '../../../../utils/font-utils';
import { getFontFamily as getFontFamilyByName } from '../../../../utils/font-families';
import { FONT_GROUPS } from '../../../../utils/font-families';
import { ThemeSelect } from '../../../../utils/theme-options';
import { FontSelector } from './font-selector';
import { ColorSelector } from './color-selector';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { useEditor } from '../../../../context/editor-context';
import { getToolDefaults } from '../../../../utils/tool-defaults';

const getCurrentFontName = (fontFamily: string) => {
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => 
      f.family === fontFamily || 
      f.bold === fontFamily || 
      f.italic === fontFamily
    );
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
}

export function FreeTextSettingsForm({
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector,
  showFontSelector,
  showColorSelector
}: FreeTextSettingsFormProps) {
  const { dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  
  // Local state for color selector
  const [localShowColorSelector, setLocalShowColorSelector] = useState<string | null>(null);
  
  const getTextStyle = () => {
    const tStyle = element.textSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
    const pageLayoutTemplateId = currentPage?.layoutTemplateId;
    const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
    const pageColorPaletteId = currentPage?.colorPaletteId;
    const bookColorPaletteId = state.currentBook?.colorPaletteId;
    const freeTextDefaults = getToolDefaults('free_text', pageTheme, bookTheme, undefined, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
    
    return {
      fontSize: tStyle.fontSize || freeTextDefaults?.fontSize || 16,
      fontFamily: tStyle.fontFamily || freeTextDefaults?.fontFamily || 'Arial, sans-serif',
      fontBold: tStyle.fontBold ?? freeTextDefaults?.fontBold ?? false,
      fontItalic: tStyle.fontItalic ?? freeTextDefaults?.fontItalic ?? false,
      fontColor: tStyle.fontColor || freeTextDefaults?.fontColor || '#1f2937',
      fontOpacity: tStyle.fontOpacity ?? 1,
      align: tStyle.align || element.format?.textAlign || freeTextDefaults?.align || 'left',
      ruledLines: tStyle.ruledLines ?? freeTextDefaults?.ruledLines ?? false,
      ruledLinesColor: tStyle.ruledLinesColor || '#1f2937',
      ruledLinesOpacity: tStyle.ruledLinesOpacity ?? 1,
      ruledLinesWidth: tStyle.ruledLinesWidth || 0.8,
      ruledLinesTheme: tStyle.ruledLinesTheme || 'rough',
      borderEnabled: tStyle.borderEnabled ?? false,
      borderColor: tStyle.borderColor || '#000000',
      borderOpacity: tStyle.borderOpacity ?? 1,
      borderWidth: tStyle.borderWidth || 1,
      borderTheme: tStyle.borderTheme || 'default',
      backgroundEnabled: tStyle.backgroundEnabled ?? false,
      backgroundColor: tStyle.backgroundColor || '#ffffff',
      backgroundOpacity: tStyle.backgroundOpacity ?? 1,
      cornerRadius: tStyle.cornerRadius || 0,
      padding: tStyle.padding || 4,
      paragraphSpacing: tStyle.paragraphSpacing || 'medium'
    };
  };
  
  const computedCurrentStyle = getTextStyle();
  
  const updateTextSetting = (key: string, value: any) => {
    const textSettingsUpdates = {
      ...element.textSettings,
      [key]: value
    };

    const elementUpdates: any = {
      textSettings: textSettingsUpdates
    };

    if (key === 'align') {
      elementUpdates.format = {
        ...element.format,
        textAlign: value
      };
      elementUpdates.align = value;
    }

    dispatch({
      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
      payload: {
        id: element.id,
        updates: elementUpdates
      }
    });
  };
  
  if (showFontSelector) {
    return (
      <FontSelector
        currentFont={computedCurrentStyle.fontFamily}
        isBold={computedCurrentStyle.fontBold}
        isItalic={computedCurrentStyle.fontItalic}
        onFontSelect={(fontName) => {
          const fontFamily = getFontFamilyByName(fontName, computedCurrentStyle.fontBold, computedCurrentStyle.fontItalic);
          updateTextSetting('fontFamily', fontFamily);
          
          // Also update element.font for proper rendering
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                font: {
                  ...element.font,
                  fontFamily: fontFamily
                },
                fontFamily: fontFamily
              }
            }
          });
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
        case 'element-text-color':
          return computedCurrentStyle.fontColor;
        case 'element-border-color':
          return computedCurrentStyle.borderColor;
        case 'element-background-color':
          return computedCurrentStyle.backgroundColor;
        case 'element-ruled-lines-color':
          return computedCurrentStyle.ruledLinesColor;
        default:
          return '#1f2937';
      }
    };
    
    const getElementOpacityValue = () => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          return computedCurrentStyle.fontOpacity;
        case 'element-border-color':
          return computedCurrentStyle.borderOpacity;
        case 'element-background-color':
          return computedCurrentStyle.backgroundOpacity;
        case 'element-ruled-lines-color':
          return computedCurrentStyle.ruledLinesOpacity;
        default:
          return 1;
      }
    };
    
    const handleElementOpacityChange = (opacity: number) => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          updateTextSetting('fontOpacity', opacity);
          break;
        case 'element-border-color':
          updateTextSetting('borderOpacity', opacity);
          break;
        case 'element-background-color':
          updateTextSetting('backgroundOpacity', opacity);
          break;
        case 'element-ruled-lines-color':
          updateTextSetting('ruledLinesOpacity', opacity);
          break;
      }
    };
    
    const handleElementColorChange = (color: string) => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          updateTextSetting('fontColor', color);
          break;
        case 'element-border-color':
          updateTextSetting('borderColor', color);
          break;
        case 'element-background-color':
          updateTextSetting('backgroundColor', color);
          break;
        case 'element-ruled-lines-color':
          updateTextSetting('ruledLinesColor', color);
          break;
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
        showOpacitySlider={false}
      />
    );
  }
  
  return (
    <>
      {/* Font Controls */}
      <div>
        <div className="flex gap-2">
          <Button
            variant={computedCurrentStyle.fontBold ? 'default' : 'outline'}
            size="xs"
            onClick={() => updateTextSetting('fontBold', !computedCurrentStyle.fontBold)}
            className="px-3"
          >
            <strong>B</strong>
          </Button>
          <Button
            variant={computedCurrentStyle.fontItalic ? 'default' : 'outline'}
            size="xs"
            onClick={() => updateTextSetting('fontItalic', !computedCurrentStyle.fontItalic)}
            className="px-3"
          >
            <em>I</em>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowFontSelector(true)}
            className="flex-1 justify-start"
            style={{ fontFamily: computedCurrentStyle.fontFamily }}
          >
            <Type className="h-4 w-4 mr-2" />
            <span className="truncate">{getCurrentFontName(computedCurrentStyle.fontFamily)}</span>
          </Button>
        </div>
      </div>
      
      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <div className='flex flex-row gap-2'>
            <ALargeSmall className='w-5 h-5'/>
            <Slider
              label="Font Size"
              value={actualToCommon(computedCurrentStyle.fontSize || 16)}
              displayValue={actualToCommon(computedCurrentStyle.fontSize || 16)}
              onChange={(value) => updateTextSetting('fontSize', commonToActual(value))}
              min={COMMON_FONT_SIZE_RANGE.min}
              max={COMMON_FONT_SIZE_RANGE.max}
              step={1}
              className='w-full'
            />
          </div>
        </div>
      </div>
      
      <div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setLocalShowColorSelector('element-text-color')}
          className="w-full"
        >
          <Palette className="w-4 mr-2" />
          Font Color
        </Button>
      </div>
      
      <div>
        <Slider
          label="Font Opacity"
          value={Math.round((computedCurrentStyle.fontOpacity ?? 1) * 100)}
          displayValue={Math.round((computedCurrentStyle.fontOpacity ?? 1) * 100)}
          onChange={(value) => updateTextSetting('fontOpacity', value / 100)}
          min={0}
          max={100}
          step={5}
          unit="%"
          hasLabel={false}
        />
      </div>
      
      <Separator/>
      
      {/* Paragraph Spacing */}
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-2">
          <Label variant="xs">Paragraph Spacing</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={computedCurrentStyle.paragraphSpacing === 'small' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('paragraphSpacing', 'small')}
              className="px-1 h-6 flex-1"
            >
              <Rows4 className="h-3 w-3" />
            </Button>
            <Button
              variant={computedCurrentStyle.paragraphSpacing === 'medium' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('paragraphSpacing', 'medium')}
              className="px-1 h-6 flex-1"
            >
              <Rows3 className="h-3 w-3" />
            </Button>
            <Button
              variant={computedCurrentStyle.paragraphSpacing === 'large' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('paragraphSpacing', 'large')}
              className="px-1 h-6 flex-1"
            >
              <Rows2 className="h-3 w-3" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      
      <Separator/>
      
      {/* Ruled Lines */}
      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={computedCurrentStyle.ruledLines}
            onCheckedChange={(checked) => updateTextSetting('ruledLines', checked)}
          />
          Ruled Lines
        </Label>
      </div>
      
      {computedCurrentStyle.ruledLines && (
        <IndentedSection>
          <Slider
            label="Line Width"
            value={Math.round((computedCurrentStyle.ruledLinesWidth ?? 1) * 100)  }
            onChange={(value) => updateTextSetting('ruledLinesWidth', value)}
            min={0.01}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Ruled Lines Theme</Label>
            <ThemeSelect 
              value={computedCurrentStyle.ruledLinesTheme}
              onChange={(value) => updateTextSetting('ruledLinesTheme', value)}
            />
          </div>
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setLocalShowColorSelector('element-ruled-lines-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Line Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Line Opacity"
              value={Math.round((computedCurrentStyle.ruledLinesOpacity ?? 1) * 100)}
              displayValue={Math.round((computedCurrentStyle.ruledLinesOpacity ?? 1) * 100)}
              onChange={(value) => updateTextSetting('ruledLinesOpacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
            />
          </div>
        </IndentedSection>
      )}
      
      <Separator/>
      
      {/* Border */}
      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={computedCurrentStyle.borderEnabled}
            onCheckedChange={(checked) => updateTextSetting('borderEnabled', checked)}
          />
          Border
        </Label>
      </div>
      
      {computedCurrentStyle.borderEnabled && (
        <IndentedSection>
          <Slider
            label="Border Width"
            value={computedCurrentStyle.borderWidth}
            onChange={(value) => updateTextSetting('borderWidth', value)}
            min={0.1}
            max={10}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Border Theme</Label>
            <ThemeSelect 
              value={computedCurrentStyle.borderTheme}
              onChange={(value) => updateTextSetting('borderTheme', value)}
            />
          </div>
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setLocalShowColorSelector('element-border-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Border Color
            </Button>
          </div>
          
          <Slider
            label="Border Opacity"
            value={computedCurrentStyle.borderOpacity * 100}
            onChange={(value) => updateTextSetting('borderOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
          />
        </IndentedSection>
      )}
      
      {/* Background */}
      <div>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={computedCurrentStyle.backgroundEnabled}
            onCheckedChange={(checked) => updateTextSetting('backgroundEnabled', checked)}
          />
          Background
        </Label>
      </div>
      
      {computedCurrentStyle.backgroundEnabled && (
        <IndentedSection>
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setLocalShowColorSelector('element-background-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Background Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Background Opacity"
              value={Math.round((computedCurrentStyle.backgroundOpacity ?? 1) * 100)}
              displayValue={Math.round((computedCurrentStyle.backgroundOpacity ?? 1) * 100)}
              onChange={(value) => updateTextSetting('backgroundOpacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
            />
          </div>
        </IndentedSection>
      )}

      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <div className='flex flex-row gap-2'>
            <SquareRoundCorner className='w-5 h-5'/>
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius(computedCurrentStyle.cornerRadius)}
              onChange={(value) => updateTextSetting('cornerRadius', commonToActualRadius(value))}
              min={COMMON_CORNER_RADIUS_RANGE.min}
              max={COMMON_CORNER_RADIUS_RANGE.max}
              step={1}
              className='w-full'
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <div className='flex flex-row gap-2'>
            <PanelTopBottomDashed className='w-5 h-5'/>
            <Slider
              label="Padding"
              value={computedCurrentStyle.padding}
              onChange={(value) => updateTextSetting('padding', value)}
              min={0}
              max={50}
              step={1}
              className='w-full'
            />
          </div>
        </div>
      </div>
      
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-2">
          <Label variant="xs">Text Align</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={computedCurrentStyle.align === 'left' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('align', 'left')}
              className="px-1 h-6 flex-1"
            >
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button
              variant={computedCurrentStyle.align === 'center' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('align', 'center')}
              className="px-1 h-6 flex-1"
            >
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button
              variant={computedCurrentStyle.align === 'right' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('align', 'right')}
              className="px-1 h-6 flex-1"
            >
              <AlignRight className="h-3 w-3" />
            </Button>
            <Button
              variant={computedCurrentStyle.align === 'justify' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateTextSetting('align', 'justify')}
              className="px-1 h-6 flex-1"
            >
              <AlignJustify className="h-3 w-3" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </>
  );
}