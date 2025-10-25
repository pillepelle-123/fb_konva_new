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
import { FONT_GROUPS } from '../../../../utils/font-families';
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

interface QnAInlineSettingsFormProps {
  sectionType: 'question' | 'answer' | 'shared';
  element: any;
  state: any;
  currentStyle: any;
  updateSetting: (key: string, value: any) => void;
  setShowFontSelector: (show: boolean) => void;
  setShowColorSelector: (type: string | null) => void;
}

export function QnAInlineSettingsForm({
  sectionType,
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector
}: QnAInlineSettingsFormProps) {
  return (
    <>
      <div>
        <div className="flex gap-2">
          <Button
            variant={currentStyle.fontBold ? 'default' : 'outline'}
            size="xs"
            onClick={() => updateSetting('fontBold', !currentStyle.fontBold)}
            className="px-3"
          >
            <strong>B</strong>
          </Button>
          <Button
            variant={currentStyle.fontItalic ? 'default' : 'outline'}
            size="xs"
            onClick={() => updateSetting('fontItalic', !currentStyle.fontItalic)}
            className="px-3"
          >
            <em>I</em>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowFontSelector(true)}
            className="flex-1 justify-start"
            style={{ fontFamily: currentStyle.fontFamily }}
          >
            <Type className="h-4 w-4 mr-2" />
            <span className="truncate">{getCurrentFontName({ font: { fontFamily: currentStyle.fontFamily } }, state)}</span>
          </Button>
        </div>
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
          <Label variant="xs">Paragraph Spacing</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                const spacing = settings?.paragraphSpacing || 'medium';
                return spacing === 'small' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSetting('paragraphSpacing', 'small')}
              className="px-1 h-6 flex-1"
            >
              <Rows4 className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                const spacing = settings?.paragraphSpacing || 'medium';
                return spacing === 'medium' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSetting('paragraphSpacing', 'medium')}
              className="px-1 h-6 flex-1"
            >
              <Rows3 className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                const spacing = settings?.paragraphSpacing || 'medium';
                return spacing === 'large' ? 'default' : 'outline';
              })()}
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
            value={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return settings?.ruledLinesWidth ?? 0.8;
            })()}
            onChange={(value) => updateSetting('ruledLinesWidth', value)}
            min={0.01}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Ruled Lines Theme</Label>
            <ThemeSelect 
              value={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                return settings?.ruledLinesTheme || 'rough';
              })()}
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
              Line Color
            </Button>
          </div>
          
          <Slider
            label="Line Opacity"
            value={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return (settings?.ruledLinesOpacity ?? 1) * 100;
            })()}
            onChange={(value) => updateSetting('ruledLinesOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
          />
        </IndentedSection>
      )}


    </>
  );
}