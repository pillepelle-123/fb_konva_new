import { Button } from '../../../ui/primitives/button';
import { Palette, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, Rows2, Rows3, Rows4, SquareRoundCorner, ALargeSmall, PanelTopBottomDashed, ChevronDown } from 'lucide-react';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { Slider } from '../../../ui/primitives/slider';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { IndentedSection } from '../../../ui/primitives/indented-section';
import { Checkbox } from '../../../ui/primitives/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/primitives/select';
import { actualToCommon, commonToActual, COMMON_FONT_SIZE_RANGE } from '../../../../utils/font-size-converter';
import { actualToCommonRadius, commonToActualRadius, COMMON_CORNER_RADIUS_RANGE } from '../../../../utils/corner-radius-converter';
import { getFontFamily } from '../../../../utils/font-utils';
import { FONT_GROUPS, getFontFamily as getFontFamilyByName } from '../../../../utils/font-families';
import { ThemeSelect } from '../../../../utils/theme-options';
import { Tooltip } from '../../../ui';

const getCurrentFontName = (element: any, state: any) => {
  const fontFamily = getFontFamily(element);
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

const getFontWeightOptions = (fontName: string) => {
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.name === fontName);
    if (font) {
      const options = [{ label: 'Normal', value: 'normal', family: font.family }];
      if (font.bold) options.push({ label: 'Bold', value: 'bold', family: font.bold });
      if (font.extraBold) options.push({ label: 'Extra Bold', value: 'extraBold', family: font.extraBold });
      return options;
    }
  }
  return [{ label: 'Normal', value: 'normal', family: 'Arial, sans-serif' }];
};

const getCurrentFontWeight = (fontFamily: string, fontName: string) => {
  const options = getFontWeightOptions(fontName);
  const current = options.find(opt => opt.family === fontFamily);
  return current?.value || 'normal';
};

interface FreeTextSettingsFormProps {
  element: any;
  state: any;
  currentStyle: any;
  updateSetting: (key: string, value: any) => void;
  setShowFontSelector: (show: boolean) => void;
  setShowColorSelector: (type: string | null) => void;
}

export function FreeTextSettingsForm({
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector
}: FreeTextSettingsFormProps) {
  return (
    <>
      <div>
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <Label variant="xs">Font Weight</Label>
            <Select
              value={getCurrentFontWeight(currentStyle.fontFamily, getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state))}
              onValueChange={(value) => {
                const fontName = getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state);
                const options = getFontWeightOptions(fontName);
                const selected = options.find(opt => opt.value === value);
                if (selected) {
                  updateSetting('fontFamily', selected.family);
                  updateSetting('fontBold', value !== 'normal');
                }
              }}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getFontWeightOptions(getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state)).map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant={currentStyle.fontItalic ? 'default' : 'outline'}
            size="xs"
            onClick={() => {
              const newItalic = !currentStyle.fontItalic;
              updateSetting('fontItalic', newItalic);
              const fontName = getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state);
              const newFontFamily = getFontFamilyByName(fontName, currentStyle.fontBold, newItalic);
              if (newFontFamily !== currentStyle.fontFamily) {
                updateSetting('fontFamily', newFontFamily);
              }
            }}
            className="px-3 mt-5"
          >
            <em>I</em>
          </Button>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowFontSelector(true)}
          className="w-full justify-start"
          style={{ fontFamily: currentStyle.fontFamily }}
        >
          <Type className="h-4 w-4 mr-2" />
          <span className="truncate">{getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state)}</span>
        </Button>
      </div>
      
      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <Tooltip content='Font Size' side='left'>
            <div className='flex flex-row gap-2'>
              <ALargeSmall className='w-5 h-5'/>
              <Slider
                label="Font Size"
                value={actualToCommon(currentStyle.fontSize)}
                onChange={(value) => updateSetting('fontSize', commonToActual(value))}
                min={COMMON_FONT_SIZE_RANGE.min}
                max={COMMON_FONT_SIZE_RANGE.max}
                step={1}
                className='w-full'
              />
            </div>
          </Tooltip>
        </div>
      </div>
      
      <div>
        <Button
          variant="outline"
          size="xs"
          onClick={() => setShowColorSelector('element-text-color')}
          className="w-full"
        >
          <Palette className="w-4 mr-2" />
          Font Color & Opacity
        </Button>
      </div>

      <Separator/>
      
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-2">
          <Label variant="xs">Text Align</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={currentStyle.align === 'left' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('align', 'left')}
              className="px-1 h-6 flex-1"
            >
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button
              variant={currentStyle.align === 'center' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('align', 'center')}
              className="px-1 h-6 flex-1"
            >
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button
              variant={currentStyle.align === 'right' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('align', 'right')}
              className="px-1 h-6 flex-1"
            >
              <AlignRight className="h-3 w-3" />
            </Button>
            <Button
              variant={currentStyle.align === 'justify' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('align', 'justify')}
              className="px-1 h-6 flex-1"
            >
              <AlignJustify className="h-3 w-3" />
            </Button>
          </ButtonGroup>
        </div>
        
        <div className="flex-1 py-2">
          <Label variant="xs">Paragraph Spacing</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={currentStyle.paragraphSpacing === 'small' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('paragraphSpacing', 'small')}
              className="px-1 h-6 flex-1"
            >
              <Rows4 className="h-3 w-3" />
            </Button>
            <Button
              variant={currentStyle.paragraphSpacing === 'medium' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('paragraphSpacing', 'medium')}
              className="px-1 h-6 flex-1"
            >
              <Rows3 className="h-3 w-3" />
            </Button>
            <Button
              variant={currentStyle.paragraphSpacing === 'large' ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateSetting('paragraphSpacing', 'large')}
              className="px-1 h-6 flex-1"
            >
              <Rows2 className="h-3 w-3" />
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={currentStyle.ruledLines}
            onCheckedChange={(checked) => updateSetting('ruledLines', checked)}
          />
          Ruled Lines
        </Label>
      </div>
      
      {currentStyle.ruledLines && (
        <IndentedSection>
          <Slider
            label="Line Width"
            value={currentStyle.ruledLinesWidth}
            onChange={(value) => updateSetting('ruledLinesWidth', value)}
            min={0.01}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Ruled Lines Theme</Label>
            <ThemeSelect 
              value={currentStyle.ruledLinesTheme}
              onChange={(value) => updateSetting('ruledLinesTheme', value)}
            />
          </div>
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('element-ruled-lines-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Ruled Lines Color & Opacity
            </Button>
          </div>
        </IndentedSection>
      )}

      <Separator/>

      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={currentStyle.background?.enabled === true}
            onCheckedChange={(checked) => updateSetting('background', { ...currentStyle.background, enabled: checked })}
          />
          Background
        </Label>
      </div>
      
      {currentStyle.background?.enabled === true && (
        <IndentedSection>
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('element-background-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Background Color & Opacity
            </Button>
          </div>
        </IndentedSection>
      )}

      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={currentStyle.border?.enabled === true}
            onCheckedChange={(checked) => updateSetting('border', { ...currentStyle.border, enabled: checked })}
          />
          Border
        </Label>
      </div>
      
      {currentStyle.border?.enabled === true && (
        <IndentedSection>
          <Slider
            label="Border Width"
            value={currentStyle.border.width}
            onChange={(value) => updateSetting('border', { ...currentStyle.border, width: value })}
            min={0.01}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Border Theme</Label>
            <ThemeSelect 
              value={currentStyle.border.theme}
              onChange={(value) => updateSetting('border', { ...currentStyle.border, theme: value })}
            />
          </div>
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowColorSelector('element-border-color')}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Border Color & Opacity
            </Button>
          </div>
        </IndentedSection>
      )}

      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <Tooltip content='Corner Radius' side='left'>
            <div className='flex flex-row gap-2'>
              <SquareRoundCorner className='w-5 h-5'/>
              <Slider
                label="Corner Radius"
                value={actualToCommonRadius(currentStyle.cornerRadius)}
                onChange={(value) => updateSetting('cornerRadius', commonToActualRadius(value))}
                min={COMMON_CORNER_RADIUS_RANGE.min}
                max={COMMON_CORNER_RADIUS_RANGE.max}
                step={1}
                className='w-full'
              />
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <Tooltip content='Padding' side='left'>
            <div className='flex flex-row gap-2'>
              <PanelTopBottomDashed className='w-5 h-5'/>
              <Slider
                label="Padding"
                value={currentStyle.padding}
                onChange={(value) => updateSetting('padding', value)}
                min={0}
                max={100}
                step={1}
                className='w-full'
              />
            </div>
          </Tooltip>
        </div>
      </div>
    </>
  );
}