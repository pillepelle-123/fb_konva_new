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
import { getFontFamily as getFontFamilyByName } from '../../../../utils/font-families';
import { FONT_GROUPS } from '../../../../utils/font-families';
import { ThemeSelect } from '../../../../utils/theme-options';
import { Tooltip } from '../../../ui';
import { useEditor } from '../../../../context/editor-context';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/composites';
import { FontSelector } from './font-selector';
import { ColorSelector } from './color-selector';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { getQnAThemeDefaults } from '../../../../utils/global-themes';

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
  showFontSelector?: boolean;
  showColorSelector?: string | null;
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
  updateAnswerSetting,
  showFontSelector,
  showColorSelector
}: QnAInlineSettingsFormProps) {
  const { dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  
  const getQuestionStyle = () => {
    const qStyle = element.questionSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    const qnaDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'question') : {};
    
    return {
      fontSize: qStyle.fontSize || qnaDefaults?.fontSize || 16,
      fontFamily: qStyle.fontFamily || qnaDefaults?.fontFamily || 'Arial, sans-serif',
      fontBold: qStyle.fontBold ?? qnaDefaults?.fontBold ?? false,
      fontItalic: qStyle.fontItalic ?? qnaDefaults?.fontItalic ?? false,
      fontColor: qStyle.fontColor || qnaDefaults?.fontColor || '#666666',
      fontOpacity: qStyle.fontOpacity ?? 1,
      align: qStyle.align || qnaDefaults?.align || 'left',
      ruledLines: qStyle.ruledLines ?? qnaDefaults?.ruledLines ?? false
    };
  };
  
  const getAnswerStyle = () => {
    const aStyle = element.answerSettings || {};
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    const qnaDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'answer') : {};
    
    return {
      fontSize: aStyle.fontSize || qnaDefaults?.fontSize || 16,
      fontFamily: aStyle.fontFamily || qnaDefaults?.fontFamily || 'Arial, sans-serif',
      fontBold: aStyle.fontBold ?? qnaDefaults?.fontBold ?? false,
      fontItalic: aStyle.fontItalic ?? qnaDefaults?.fontItalic ?? false,
      fontColor: aStyle.fontColor || qnaDefaults?.fontColor || '#1f2937',
      fontOpacity: aStyle.fontOpacity ?? 1,
      align: aStyle.align || qnaDefaults?.align || 'left',
      ruledLines: aStyle.ruledLines ?? qnaDefaults?.ruledLines ?? false
    };
  };
  
  const computedQuestionStyle = questionStyle || getQuestionStyle();
  const computedAnswerStyle = answerStyle || getAnswerStyle();
  const computedCurrentStyle = activeSection === 'question' ? computedQuestionStyle : computedAnswerStyle;
  const computedUpdateSetting = activeSection === 'question' ? updateQuestionSetting : updateAnswerSetting;
  
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
  
  const renderFontControls = () => {
    const isSharedMode = !individualSettings && sectionType === 'shared';
    const updateFn = isSharedMode ? updateSharedSetting : updateSetting;
    
    return (
      <>
        <div>
          <div className="flex gap-2">
            <Button
              variant={currentStyle.fontBold ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateFn('fontBold', !currentStyle.fontBold)}
              className="px-3"
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={currentStyle.fontItalic ? 'default' : 'outline'}
              size="xs"
              onClick={() => updateFn('fontItalic', !currentStyle.fontItalic)}
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
              <span className="truncate">{getCurrentFontName(currentStyle.fontFamily)}</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 py-2 w-full">
          <div className='flex-1'>
            <div className='flex flex-row gap-2'>
              <ALargeSmall className='w-5 h-5'/>
              <Slider
                label="Font Size"
                value={actualToCommon(currentStyle.fontSize || 16)}
                displayValue={actualToCommon(currentStyle.fontSize || 16)}
                onChange={(value) => updateFn('fontSize', commonToActual(value))}
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
            onClick={() => setShowColorSelector('element-text-color')}
            className="w-full"
          >
            <Palette className="w-4 mr-2" />
            Font Color & Opacity
          </Button>
        </div>
      </>
    );
  };
  
  // Handle font selector
  if (showFontSelector) {
    return (
      <FontSelector
        currentFont={computedCurrentStyle.fontFamily}
        isBold={computedCurrentStyle.fontBold}
        isItalic={computedCurrentStyle.fontItalic}
        onFontSelect={(fontName) => {
          const fontFamily = getFontFamilyByName(fontName, computedCurrentStyle.fontBold, computedCurrentStyle.fontItalic);
          
          if (computedUpdateSetting) {
            computedUpdateSetting('fontFamily', fontFamily);
          } else {
            updateSetting('fontFamily', fontFamily);
          }
          
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
  
  // Handle color selector
  if (showColorSelector && showColorSelector.startsWith('element-')) {
    const getColorValue = () => {
      switch (showColorSelector) {
        case 'element-text-color':
          return computedCurrentStyle.fontColor;
        case 'element-border-color':
          const borderSettings = activeSection === 'question' ? element.questionSettings : element.answerSettings;
          return borderSettings?.borderColor || '#000000';
        case 'element-background-color':
          const bgSettings = activeSection === 'question' ? element.questionSettings : element.answerSettings;
          return bgSettings?.backgroundColor || '#ffffff';
        case 'element-ruled-lines-color':
          const ruledSettings = activeSection === 'question' ? element.questionSettings : element.answerSettings;
          return ruledSettings?.ruledLinesColor || '#1f2937';
        default:
          return '#1f2937';
      }
    };
    
    const getElementOpacityValue = () => {
      switch (showColorSelector) {
        case 'element-text-color':
          return (computedCurrentStyle as any).fontOpacity ?? 1;
        case 'element-border-color': {
          const qSettings = element.questionSettings || {};
          const aSettings = element.answerSettings || {};
          return qSettings.borderOpacity ?? aSettings.borderOpacity ?? 1;
        }
        case 'element-background-color': {
          const bgOpacitySettings = activeSection === 'question' ? element.questionSettings : element.answerSettings;
          return bgOpacitySettings?.backgroundOpacity ?? 1;
        }
        case 'element-ruled-lines-color': {
          const ruledOpacitySettings = activeSection === 'question' ? element.questionSettings : element.answerSettings;
          return ruledOpacitySettings?.ruledLinesOpacity ?? 1;
        }
        default:
          return 1;
      }
    };
    
    const handleElementOpacityChange = (opacity: number) => {
      const updateFn = computedUpdateSetting || updateSetting;
      switch (showColorSelector) {
        case 'element-text-color':
          if (!individualSettings && sectionType === 'shared') {
            updateSharedSetting('fontOpacity', opacity);
          } else {
            updateFn('fontOpacity', opacity);
          }
          break;
        case 'element-border-color':
          updateFn('borderOpacity', opacity);
          break;
        case 'element-background-color':
          updateFn('backgroundOpacity', opacity);
          break;
        case 'element-ruled-lines-color':
          updateFn('ruledLinesOpacity', opacity);
          break;
      }
    };
    
    const handleElementColorChange = (color: string) => {
      const updateFn = computedUpdateSetting || updateSetting;
      switch (showColorSelector) {
        case 'element-text-color':
          if (!individualSettings && sectionType === 'shared') {
            updateSharedSetting('fontColor', color);
          } else {
            updateFn('fontColor', color);
          }
          break;
        case 'element-border-color':
          updateFn('borderColor', color);
          break;
        case 'element-background-color':
          updateFn('backgroundColor', color);
          break;
        case 'element-ruled-lines-color':
          updateFn('ruledLinesColor', color);
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
        onBack={() => setShowColorSelector(null)}
      />
    );
  }
  
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
            <>
              <div className="flex flex-row items-start">
                <div className="flex-1 ">
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
              
                {/* Question Width Slider (only for left/right positions) */}
                {((element.questionPosition || 'left') === 'left' || (element.questionPosition || 'left') === 'right') && (
                  <div className="flex-1">
                    <Label variant="xs">Question Width</Label>
                    <Slider
                      label="Question Width"
                      value={element.questionWidth || 40}
                      onChange={(value) => {
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: element.id,
                            updates: { questionWidth: value }
                          }
                        });
                      }}
                      min={25}
                      max={75}
                      step={5}
                      unit="%"
                      className="w-full"
                    />
                  </div>
                  
              )}
              </div>
            </>
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
              onCheckedChange={(checked) => {
                if (!checked) {
                  // When disabling individual settings, align question to answer settings
                  const answerStyle = getAnswerStyle();
                  const questionUpdates = {
                    fontSize: answerStyle.fontSize,
                    fontFamily: answerStyle.fontFamily,
                    fontBold: answerStyle.fontBold,
                    fontItalic: answerStyle.fontItalic,
                    fontColor: answerStyle.fontColor,
                    fontOpacity: answerStyle.fontOpacity
                  };
                  
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates: {
                        questionSettings: {
                          ...element.questionSettings,
                          ...questionUpdates
                        }
                      }
                    }
                  });
                }
                onIndividualSettingsChange?.(checked);
              }}
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
                      currentStyle={getQuestionStyle()}
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
                      currentStyle={getAnswerStyle()}
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