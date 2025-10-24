import { Button } from '../../../ui/primitives/button';
import { Palette, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, Rows2, Rows3, Rows4, SquareRoundCorner, ALargeSmall, PanelTopBottomDashed } from 'lucide-react';
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

interface QnASettingsFormProps {
  sectionType: 'question' | 'answer' | 'shared';
  element: any;
  state: any;
  currentStyle: any;
  updateSetting: (key: string, value: any) => void;
  setShowFontSelector: (show: boolean) => void;
  setShowColorSelector: (type: string | null) => void;
}

export function QnASettingsForm({
  sectionType,
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector
}: QnASettingsFormProps) {
  return (
    <>
      {/* <Label variant='xs'>{sectionType === 'shared' ? 'Font' : (sectionType === 'question' ? 'Question' : 'Answer') + ' Font'}</Label> */}
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
      <div className="flex flex-row gap-2 py-1 w-full">
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
      
      {/* <Slider
        label="Text Opacity"
        value={(() => {
          const settings = sectionType === 'question' ? element.questionSettings : element.answerSettings;
          const opacity = settings?.fontOpacity * 100;
          return opacity ?? 100;
        })()}
        onChange={(value) => updateSetting('fontOpacity', value / 100)}
        min={0}
        max={100}
        step={5}
      /> */}

      <Separator/>
      
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-1">
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
        
        <div className="flex-1 py-1">
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

      <div className='py-1'>
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

      <Separator/>
      
      <div className='py-1'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return settings?.borderEnabled ?? false;
            })()}
            onCheckedChange={(checked) => updateSetting('borderEnabled', checked)}
          />
          Border
        </Label>
      </div>
      
      {(() => {
        const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
        return settings?.borderEnabled;
      })() && (
        <IndentedSection>
          <Slider
            label="Border Width"
            value={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return settings?.borderWidth ?? 1;
            })()}
            onChange={(value) => updateSetting('borderWidth', value)}
            min={0.1}
            max={10}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Border Theme</Label>
            <ThemeSelect 
              value={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                return settings?.borderTheme || 'rough';
              })()}
              onChange={(value) => updateSetting('borderTheme', value)}
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
              Border Color
            </Button>
          </div>
          
          <Slider
            label="Border Opacity"
            value={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return (settings?.borderOpacity ?? 1) * 100;
            })()}
            onChange={(value) => updateSetting('borderOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
          />
        </IndentedSection>
      )}
      
      <div className='py-1'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
              return settings?.backgroundEnabled ?? false;
            })()}
            onCheckedChange={(checked) => updateSetting('backgroundEnabled', checked)}
          />
          Background
        </Label>
      </div>
      
      {(() => {
        const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
        return settings?.backgroundEnabled;
      })() && (
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
          
          {/* <Slider
            label="Background Opacity"
            value={(() => {
              const settings = sectionType === 'question' ? element.questionSettings : element.answerSettings;
              return settings?.backgroundOpacity ?? 1;
            })()}
            onChange={(value) => updateSetting('backgroundOpacity', value)}
            min={0}
            max={1}
            step={0.01}
          /> */}
        </IndentedSection>
      )}
      {/* <div className='flex flex-row gap-2 w-full'>
        <SquareRoundCorner className='w-5 h-5'/>
        <Slider
          label="Corner Radius"
          value={actualToCommonRadius((() => {
            const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
            return settings?.cornerRadius ?? 0;
          })())}
          onChange={(value) => updateSetting('cornerRadius', commonToActualRadius(value))}
          min={COMMON_CORNER_RADIUS_RANGE.min}
          max={COMMON_CORNER_RADIUS_RANGE.max}
          step={1}
          className='w-full'
        />
      </div> */}

      <div className="flex flex-row gap-2 py-1 w-full">
        <div className='flex-1'>
        <Tooltip content='Corner Radius' side='left'>
          <div className='flex flex-row gap-2'>
            <SquareRoundCorner className='w-5 h-5'/>
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius((() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                return settings?.cornerRadius ?? 0;
              })())}              
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
      <div className="flex flex-row gap-2 py-1 w-full">
        <div className='flex-1'>
        <Tooltip content='Padding' side='left'>
          <div className='flex flex-row gap-2'>
            <PanelTopBottomDashed className='w-5 h-5'/>
            <Slider
              label="Padding"
              value={(() => {
                const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
                return settings?.padding ?? 4;
              })()}              
              onChange={(value) => updateSetting('padding', value)}
              min={0}
              max={50}
              step={1}
              className='w-full'
            />
          </div>
        </Tooltip>
        </div>
      </div>


      {/* <Slider
        label="Padding"
        value={(() => {
          const settings = sectionType === 'shared' ? element.questionSettings : (sectionType === 'question' ? element.questionSettings : element.answerSettings);
          return settings?.padding ?? 4;
        })()}
        onChange={(value) => updateSetting('padding', value)}
        min={0}
        max={50}
        step={1}
      /> */}
    </>
  );
}