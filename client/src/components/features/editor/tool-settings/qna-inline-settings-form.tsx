import { Button } from '../../../ui/primitives/button';
import { Palette, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, ALargeSmall, Rows4, Rows3, Rows2, SquareRoundCorner, PanelTopBottomDashed, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
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
import { useEditor } from '../../../../context/editor-context';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites';

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
  showLayoutControls?: boolean;
  individualSettings?: boolean;
  onIndividualSettingsChange?: (enabled: boolean) => void;
  activeSection?: 'question' | 'answer';
  onActiveSectionChange?: (section: 'question' | 'answer') => void;
  questionStyle?: any;
  answerStyle?: any;
  updateQuestionSetting?: (key: string, value: any) => void;
  updateAnswerSetting?: (key: string, value: any) => void;
}

export function QnAInlineSettingsForm({
  sectionType,
  element,
  state,
  currentStyle,
  updateSetting,
  setShowFontSelector,
  setShowColorSelector,
  showLayoutControls = false,
  individualSettings = false,
  onIndividualSettingsChange,
  activeSection = 'question',
  onActiveSectionChange,
  questionStyle,
  answerStyle,
  updateQuestionSetting,
  updateAnswerSetting
}: QnAInlineSettingsFormProps) {
  const { dispatch } = useEditor();
  
  const updateSharedSetting = (key: string, value: any) => {
    const updates = {
      questionSettings: {
        ...element.questionSettings,
        [key]: value
      },
      answerSettings: {
        ...element.answerSettings,
        [key]: value
      }
    };
    
    if (state.selectedGroupedElement) {
      dispatch({
        type: 'UPDATE_GROUPED_ELEMENT',
        payload: {
          groupId: state.selectedGroupedElement.groupId,
          elementId: state.selectedGroupedElement.elementId,
          updates
        }
      });
    } else {
      dispatch({
        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
        payload: { id: element.id, updates }
      });
    }
  };
  
  const renderFontControls = () => (
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
    </>
  );
  
  // For individual tabs, only show font controls (no spacing)
  if (sectionType !== 'shared' && individualSettings) {
    return renderFontControls();
  }
  
  return (
    <>
      {/* Layout controls - only show when requested */}
      {showLayoutControls && (
        <>
          <div className="space-y-1">
            <Label variant="xs">Layout</Label>
            <ButtonGroup className="w-full">
              <Button
                variant={(element.layoutVariant || 'inline') === 'inline' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates: { layoutVariant: 'inline' }
                    }
                  });
                }}
                className="flex-1"
              >
                Inline
              </Button>
              <Button
                variant={(element.layoutVariant || 'inline') === 'block' ? 'default' : 'outline'}
                size="xs"
                onClick={() => {
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates: { layoutVariant: 'block' }
                    }
                  });
                }}
                className="flex-1"
              >
                Block
              </Button>
            </ButtonGroup>
          </div>
          
          {/* Question Position (only for block layout) */}
          {element.layoutVariant === 'block' && (
            <div className="space-y-1">
              <Label variant="xs">Question Position</Label>
              <ButtonGroup>
                <Button
                  variant={(element.questionPosition || 'left') === 'left' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: element.id,
                        updates: { questionPosition: 'left' }
                      }
                    });
                  }}
                  className="w-8 h-8 p-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant={(element.questionPosition || 'left') === 'top' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: element.id,
                        updates: { questionPosition: 'top' }
                      }
                    });
                  }}
                  className="w-8 h-8 p-0"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant={(element.questionPosition || 'left') === 'right' ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => {
                    dispatch({
                      type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                      payload: {
                        id: element.id,
                        updates: { questionPosition: 'right' }
                      }
                    });
                  }}
                  className="w-8 h-8 p-0"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </ButtonGroup>
            </div>
          )}
          
          <Separator />
        </>
      )}
      
      {/* Individual settings checkbox - only show for shared mode */}
      {sectionType === 'shared' && onIndividualSettingsChange && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              checked={individualSettings}
              onCheckedChange={onIndividualSettingsChange}
            />
            <Label variant="xs" className="text-xs font-medium">
              Individual for Question and Answer
            </Label>
          </div>
          
          {/* Tabs - only show when individual settings are enabled */}
          {individualSettings && onActiveSectionChange && (
            <>
              <Tabs value={activeSection} onValueChange={onActiveSectionChange}>
                <TabsList variant="bootstrap" className="w-full h-5">
                  <TabsTrigger variant="bootstrap" value="question" className=' h-5'>Question</TabsTrigger>
                  <TabsTrigger variant="bootstrap" value="answer" className=' h-5'>Answer</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="overflow-hidden">
                <div className={`flex flex--row transition-transform duration-300 ease-in-out ${activeSection === 'question' ? 'translate-x-0' : '-translate-x-1/2'}`} style={{ width: '200%' }}>
                  <div className="w-1/2 flex-1 flex-shrink-0">
                    <QnAInlineSettingsForm
                      sectionType="question"
                      element={element}
                      state={state}
                      currentStyle={questionStyle || currentStyle}
                      updateSetting={updateQuestionSetting || updateSetting}
                      setShowFontSelector={setShowFontSelector}
                      setShowColorSelector={setShowColorSelector}
                      showLayoutControls={false}
                      individualSettings={true}
                    />
                  </div>
                  <div className="w-1/2 flex-1 flex-shrink-0">
                    <QnAInlineSettingsForm
                      sectionType="answer"
                      element={element}
                      state={state}
                      currentStyle={answerStyle || currentStyle}
                      updateSetting={updateAnswerSetting || updateSetting}
                      setShowFontSelector={setShowFontSelector}
                      setShowColorSelector={setShowColorSelector}
                      showLayoutControls={false}
                      individualSettings={true}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
      
      {/* Font controls - only show when individual settings are disabled */}
      {!individualSettings && renderFontControls()}
      
      <Separator/>
      
      {/* Paragraph Spacing - always universal */}
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-2">
          <Label variant="xs">Paragraph Spacing</Label>
          <ButtonGroup className="mt-1 flex flex-row">
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || 'medium';
                return spacing === 'small' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('paragraphSpacing', 'small')}
              className="px-1 h-6 flex-1"
            >
              <Rows4 className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || 'medium';
                return spacing === 'medium' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('paragraphSpacing', 'medium')}
              className="px-1 h-6 flex-1"
            >
              <Rows3 className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || 'medium';
                return spacing === 'large' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('paragraphSpacing', 'large')}
              className="px-1 h-6 flex-1"
            >
              <Rows2 className="h-3 w-3" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
      
      <Separator/>
      
      {/* Ruled Lines - Common Settings */}
      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const aSettings = element.answerSettings || {};
              return aSettings.ruledLines ?? false;
            })()}
            onCheckedChange={(checked) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    answerSettings: {
                      ...element.answerSettings,
                      ruledLines: checked
                    }
                  }
                }
              });
            }}
          />
          Ruled Lines
        </Label>
      </div>
      
      {(() => {
        const aSettings = element.answerSettings || {};
        return aSettings.ruledLines ?? false;
      })() && (
        <IndentedSection>
          <Slider
            label="Line Width"
            value={(() => {
              const aSettings = element.answerSettings || {};
              return aSettings.ruledLinesWidth ?? 0.8;
            })()}
            onChange={(value) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    answerSettings: {
                      ...element.answerSettings,
                      ruledLinesWidth: value
                    }
                  }
                }
              });
            }}
            min={0.01}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Ruled Lines Theme</Label>
            <ThemeSelect 
              value={(() => {
                const aSettings = element.answerSettings || {};
                return aSettings.ruledLinesTheme || 'rough';
              })()}
              onChange={(value) => {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: {
                      answerSettings: {
                        ...element.answerSettings,
                        ruledLinesTheme: value
                      }
                    }
                  }
                });
              }}
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
              const aSettings = element.answerSettings || {};
              return (aSettings.ruledLinesOpacity ?? 1) * 100;
            })()}
            onChange={(value) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    answerSettings: {
                      ...element.answerSettings,
                      ruledLinesOpacity: value / 100
                    }
                  }
                }
              });
            }}
            min={0}
            max={100}
            step={5}
          />
        </IndentedSection>
      )}
      
      <Separator/>
      
      {/* Shared Settings - Always visible */}
      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const qSettings = element.questionSettings || {};
              const aSettings = element.answerSettings || {};
              return qSettings.borderEnabled || aSettings.borderEnabled || false;
            })()}
            onCheckedChange={(checked) => updateSharedSetting('borderEnabled', checked)}
          />
          Border
        </Label>
      </div>
      
      {(() => {
        const qSettings = element.questionSettings || {};
        const aSettings = element.answerSettings || {};
        return qSettings.borderEnabled || aSettings.borderEnabled;
      })() && (
        <IndentedSection>
          <Slider
            label="Border Width"
            value={(() => {
              const qSettings = element.questionSettings || {};
              const aSettings = element.answerSettings || {};
              return qSettings.borderWidth || aSettings.borderWidth || 1;
            })()}
            onChange={(value) => updateSharedSetting('borderWidth', value)}
            min={0.1}
            max={10}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Border Theme</Label>
            <ThemeSelect 
              value={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                return qSettings.borderTheme || aSettings.borderTheme || 'rough';
              })()}
              onChange={(value) => updateSharedSetting('borderTheme', value)}
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
              const qSettings = element.questionSettings || {};
              const aSettings = element.answerSettings || {};
              return (qSettings.borderOpacity || aSettings.borderOpacity || 1) * 100;
            })()}
            onChange={(value) => updateSharedSetting('borderOpacity', value / 100)}
            min={0}
            max={100}
            step={5}
          />
        </IndentedSection>
      )}
      
      <div>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const qSettings = element.questionSettings || {};
              const aSettings = element.answerSettings || {};
              return qSettings.backgroundEnabled || aSettings.backgroundEnabled || false;
            })()}
            onCheckedChange={(checked) => updateSharedSetting('backgroundEnabled', checked)}
          />
          Background
        </Label>
      </div>
      
      {(() => {
        const qSettings = element.questionSettings || {};
        const aSettings = element.answerSettings || {};
        return qSettings.backgroundEnabled || aSettings.backgroundEnabled;
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
        </IndentedSection>
      )}

      <div className="flex flex-row gap-2 py-2 w-full">
        <div className='flex-1'>
          <div className='flex flex-row gap-2'>
            <SquareRoundCorner className='w-5 h-5'/>
            <Slider
              label="Corner Radius"
              value={actualToCommonRadius((() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                return qSettings.cornerRadius || aSettings.cornerRadius || 0;
              })())}              
              onChange={(value) => updateSharedSetting('cornerRadius', commonToActualRadius(value))}
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
              value={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                return qSettings.padding || aSettings.padding || 4;
              })()}              
              onChange={(value) => updateSharedSetting('padding', value)}
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
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const align = qSettings.align || aSettings.align || 'left';
                return align === 'left' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('align', 'left')}
              className="px-1 h-6 flex-1"
            >
              <AlignLeft className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const align = qSettings.align || aSettings.align || 'left';
                return align === 'center' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('align', 'center')}
              className="px-1 h-6 flex-1"
            >
              <AlignCenter className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const align = qSettings.align || aSettings.align || 'left';
                return align === 'right' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('align', 'right')}
              className="px-1 h-6 flex-1"
            >
              <AlignRight className="h-3 w-3" />
            </Button>
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const align = qSettings.align || aSettings.align || 'left';
                return align === 'justify' ? 'default' : 'outline';
              })()}
              size="xs"
              onClick={() => updateSharedSetting('align', 'justify')}
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