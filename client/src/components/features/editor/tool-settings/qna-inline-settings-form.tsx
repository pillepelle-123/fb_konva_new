import { useState, useEffect } from 'react';
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
import { getQnAThemeDefaults, getQnAInlineThemeDefaults } from '../../../../utils/global-themes';
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
  
  // Local state for QnA color selector
  const [localShowColorSelector, setLocalShowColorSelector] = useState<string | null>(null);
  
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
  
  // Close color selector when activeSection changes
  useEffect(() => {
    setLocalShowColorSelector(null);
    setShowColorSelector(null);
  }, [activeSection, setShowColorSelector]);
  
  const getQuestionStyle = () => {
    const qStyle = element.questionSettings || {};
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
      align: qStyle.align || element.format?.textAlign || element.align || qnaDefaults?.align || 'left',
      ruledLines: qStyle.ruledLines ?? qnaDefaults?.ruledLines ?? false
    };
  };
  
  const getAnswerStyle = () => {
    const aStyle = element.answerSettings || {};
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
      align: aStyle.align || element.format?.textAlign || element.align || qnaDefaults?.align || 'left',
      ruledLines: aStyle.ruledLines ?? qnaDefaults?.ruledLines ?? false
    };
  };
  
  const computedQuestionStyle = questionStyle || getQuestionStyle();
  const computedAnswerStyle = answerStyle || getAnswerStyle();
  // When individualSettings is false, use answer style for both question and answer
  const computedCurrentStyle = (!individualSettings && sectionType === 'shared') 
    ? computedAnswerStyle 
    : (activeSection === 'question' ? computedQuestionStyle : computedAnswerStyle);
  
  // Get theme defaults for checking border/background enabled state
  const getThemeDefaults = () => {
    const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
    const pageLayoutTemplateId = currentPage?.layoutTemplateId;
    const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
    const pageColorPaletteId = currentPage?.colorPaletteId;
    const bookColorPaletteId = state.currentBook?.colorPaletteId;
    return getToolDefaults('qna_inline', pageTheme, bookTheme, element, undefined, pageLayoutTemplateId, bookLayoutTemplateId, pageColorPaletteId, bookColorPaletteId);
  };
  
  const updateSharedSetting = (key: string, value: any) => {
    const updates: any = {};
    const themeDefaults = getThemeDefaults();

    // Handle border/background properties - set only on top-level
    // Border/Background are shared properties, so borderEnabled/backgroundEnabled are only on top-level
    if (key === 'borderEnabled') {
      const borderColor = element.borderColor || element.questionSettings?.border?.borderColor || element.answerSettings?.border?.borderColor || themeDefaults.borderColor || '#000000';
      const borderWidth = element.borderWidth || element.questionSettings?.borderWidth || element.answerSettings?.borderWidth || (themeDefaults.borderWidth ?? 1);
      const borderOpacity = element.borderOpacity ?? element.questionSettings?.borderOpacity ?? element.answerSettings?.borderOpacity ?? themeDefaults.borderOpacity ?? 1;
      const borderTheme = element.borderTheme || element.questionSettings?.borderTheme || element.answerSettings?.borderTheme || themeDefaults.borderTheme || 'default';
      
      // Set all border properties on top-level only (no border object, no nested border.enabled)
      updates.borderEnabled = value;
      updates.borderWidth = borderWidth;
      updates.borderColor = borderColor;
      updates.borderOpacity = borderOpacity;
      updates.borderTheme = borderTheme;
    } else if (key === 'backgroundEnabled') {
      const backgroundColor = element.backgroundColor || element.questionSettings?.background?.backgroundColor || element.answerSettings?.background?.backgroundColor || themeDefaults.backgroundColor || '#ffffff';
      const backgroundOpacity = element.backgroundOpacity ?? element.questionSettings?.backgroundOpacity ?? element.answerSettings?.backgroundOpacity ?? themeDefaults.backgroundOpacity ?? 1;
      
      // Set all background properties on top-level only (no background object, no nested background.enabled)
      updates.backgroundEnabled = value;
      updates.backgroundColor = backgroundColor;
      updates.backgroundOpacity = backgroundOpacity;
    } else if (key === 'borderWidth') {
      const borderColor = element.borderColor || element.questionSettings?.border?.borderColor || element.answerSettings?.border?.borderColor || themeDefaults.borderColor || '#000000';
      const borderOpacity = element.borderOpacity ?? element.questionSettings?.borderOpacity ?? element.answerSettings?.borderOpacity ?? themeDefaults.borderOpacity ?? 1;
      const borderTheme = element.borderTheme || element.questionSettings?.borderTheme || element.answerSettings?.borderTheme || themeDefaults.borderTheme || 'default';
      
      // Only set on top-level (only individual properties, no border object)
      updates.borderWidth = value;
      updates.borderColor = borderColor;
      updates.borderOpacity = borderOpacity;
      updates.borderTheme = borderTheme;
    } else if (key === 'borderTheme') {
      const borderColor = element.borderColor || element.questionSettings?.border?.borderColor || element.answerSettings?.border?.borderColor || themeDefaults.borderColor || '#000000';
      const borderWidth = element.borderWidth || element.questionSettings?.borderWidth || element.answerSettings?.borderWidth || (themeDefaults.borderWidth ?? 1);
      const borderOpacity = element.borderOpacity ?? element.questionSettings?.borderOpacity ?? element.answerSettings?.borderOpacity ?? (themeDefaults.borderOpacity ?? 1);
      
      // Only set on top-level (only individual properties, no border object)
      updates.borderTheme = value;
      updates.borderWidth = borderWidth;
      updates.borderColor = borderColor;
      updates.borderOpacity = borderOpacity;
    } else if (key === 'borderOpacity') {
      const borderColor = element.borderColor || element.questionSettings?.border?.borderColor || element.answerSettings?.border?.borderColor || themeDefaults.borderColor || '#000000';
      const borderWidth = element.borderWidth || element.questionSettings?.borderWidth || element.answerSettings?.borderWidth || (themeDefaults.borderWidth ?? 1);
      const borderTheme = element.borderTheme || element.questionSettings?.borderTheme || element.answerSettings?.borderTheme || themeDefaults.borderTheme || 'default';
      
      // Only set on top-level (only individual properties, no border object)
      updates.borderOpacity = value;
      updates.borderWidth = borderWidth;
      updates.borderColor = borderColor;
      updates.borderTheme = borderTheme;
    } else if (key === 'backgroundOpacity') {
      const backgroundColor = element.backgroundColor || element.questionSettings?.background?.backgroundColor || element.answerSettings?.background?.backgroundColor || themeDefaults.backgroundColor || '#ffffff';
      
      // Only set on top-level (only individual properties, no background object)
      updates.backgroundOpacity = value;
      updates.backgroundColor = backgroundColor;
    } else if (key === 'cornerRadius') {
      updates.cornerRadius = value;
    } else if (['fontBold', 'fontItalic', 'fontSize', 'fontFamily', 'fontColor', 'fontOpacity'].includes(key)) {
      // Font properties: when individualSettings is false, update both questionSettings and answerSettings
      // Use answer settings as the source of truth
      updates.questionSettings = {
        ...element.questionSettings,
        [key]: value
      };
      updates.answerSettings = {
        ...element.answerSettings,
        [key]: value
      };
    } else {
      // For other shared properties (padding, paragraphSpacing, align), set only on top-level
      updates[key] = value;
    }
    
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
  
  // When individualSettings is false and sectionType is shared, use updateSharedSetting to update both
  const computedUpdateSetting = (!individualSettings && sectionType === 'shared')
    ? updateSharedSetting
    : (activeSection === 'question' ? (updateQuestionSetting || updateSetting) : (updateAnswerSetting || updateSetting));
  
  const renderFontControls = () => {
    // When individualSettings is false, always use updateSharedSetting to update both questionSettings and answerSettings
    // Otherwise, use computedUpdateSetting which handles question/answer sections
    const updateFn = !individualSettings ? updateSharedSetting : (computedUpdateSetting || updateSetting);
    // When individualSettings is false, use answer style for display
    const displayStyle = (!individualSettings && sectionType === 'shared') ? computedAnswerStyle : currentStyle;
    
    return (
      <>
        <div>
          <div className="flex gap-2">
            <Button
              variant={displayStyle.fontBold ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                // Nur fontBold aktualisieren - CSS font-weight wird verwendet, Font-Familie bleibt unverändert
                updateFn('fontBold', !displayStyle.fontBold);
              }}
              className="px-3"
            >
              <strong>B</strong>
            </Button>
            <Button
              variant={displayStyle.fontItalic ? 'default' : 'outline'}
              size="xs"
              onClick={() => {
                // Nur fontItalic aktualisieren - CSS font-style wird verwendet, Font-Familie bleibt unverändert
                updateFn('fontItalic', !displayStyle.fontItalic);
              }}
              className="px-3"
            >
              <em>I</em>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowFontSelector(true)}
              className="flex-1 justify-start"
              style={{ fontFamily: displayStyle.fontFamily }}
            >
              <Type className="h-4 w-4 mr-2" />
              <span className="truncate">{getCurrentFontName(displayStyle.fontFamily)}</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 py-2 w-full">
          <div className='flex-1'>
            <div className='flex flex-row gap-2'>
              <ALargeSmall className='w-5 h-5'/>
              <Slider
                label="Font Size"
                value={actualToCommon(displayStyle.fontSize || 16)}
                displayValue={actualToCommon(displayStyle.fontSize || 16)}
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
            onClick={() => {
              // When individualSettings is enabled, use setShowColorSelector to render at top level
              // Otherwise, use localShowColorSelector for nested rendering
              if (individualSettings) {
                setShowColorSelector('element-text-color');
              } else {
                setLocalShowColorSelector('element-text-color');
              }
            }}
            className="w-full"
          >
            <Palette className="w-4 mr-2" />
            Font Color
          </Button>
        </div>
        
        <div>
          <Slider
            label="Font Opacity"
            value={Math.round((displayStyle.fontOpacity ?? 1) * 100)}
            displayValue={Math.round((displayStyle.fontOpacity ?? 1) * 100)}
            onChange={(value) => {
              const opacity = value / 100;
              if (!individualSettings && sectionType === 'shared') {
                updateSharedSetting('fontOpacity', opacity);
              } else if (individualSettings && (sectionType === 'question' || activeSection === 'question')) {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: {
                      questionSettings: {
                        ...element.questionSettings,
                        fontOpacity: opacity
                      }
                    }
                  }
                });
              } else {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: {
                      answerSettings: {
                        ...element.answerSettings,
                        fontOpacity: opacity
                      }
                    }
                  }
                });
              }
            }}
            min={0}
            max={100}
            step={5}
            unit="%"
            hasLabel={false}
          />
        </div>
      </>
    );
  };
  
  // Handle font selector or color selector at top level
  if (showFontSelector) {
    return (
      <FontSelector
        currentFont={computedCurrentStyle.fontFamily}
        isBold={computedCurrentStyle.fontBold}
        isItalic={computedCurrentStyle.fontItalic}
        onFontSelect={(fontName) => {
          // Verwende immer die Basis-Font-Familie, ohne Bold/Italic-Varianten
          // Bold/Italic wird über CSS font-weight und font-style gesteuert
          const fontFamily = getFontFamilyByName(fontName, false, false);
          
          if (computedUpdateSetting) {
            computedUpdateSetting('fontFamily', fontFamily);
          } else if (!individualSettings && sectionType === 'shared') {
            updateSharedSetting('fontFamily', fontFamily);
          } else {
            updateSetting('fontFamily', fontFamily);
          }
        }}
        onBack={() => setShowFontSelector(false)}
        element={element}
        state={state}
      />
    );
  }
  
  // Only render ColorSelector locally if individualSettings is disabled
  // When individualSettings is enabled, ColorSelector is rendered at top level via setShowColorSelector
  if (localShowColorSelector && !individualSettings) {
    const getColorValue = () => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          // In shared mode without individual settings, use the question color as primary
          // In individual mode, use the active section's color
          if (!individualSettings && sectionType === 'shared') {
            // Shared mode: prefer question settings, but check both
            return element.questionSettings?.fontColor || 
                   element.answerSettings?.fontColor || 
                   computedCurrentStyle.fontColor || 
                   '#666666';
          } else if (activeSection === 'question') {
            return element.questionSettings?.fontColor || computedCurrentStyle.fontColor || '#666666';
          } else {
            return element.answerSettings?.fontColor || computedCurrentStyle.fontColor || '#1f2937';
          }
        case 'element-border-color':
          return element.borderColor || element.border?.borderColor || element.questionSettings?.border?.borderColor || element.answerSettings?.border?.borderColor || '#000000';
        case 'element-background-color':
          return element.backgroundColor || element.background?.backgroundColor || element.questionSettings?.background?.backgroundColor || element.answerSettings?.background?.backgroundColor || '#ffffff';
        case 'element-ruled-lines-color':
          return element.ruledLinesColor || '#1f2937';
        default:
          return '#1f2937';
      }
    };
    
    const getElementOpacityValue = () => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          if (!individualSettings && sectionType === 'shared') {
            return element.questionSettings?.fontOpacity ?? element.answerSettings?.fontOpacity ?? 1;
          } else if (activeSection === 'question') {
            return element.questionSettings?.fontOpacity ?? 1;
          } else {
            return element.answerSettings?.fontOpacity ?? 1;
          }
        case 'element-border-color': {
          const themeDefaults = getThemeDefaults();
              return element.borderOpacity ?? 
                     element.questionSettings?.borderOpacity ?? 
                     element.answerSettings?.borderOpacity ?? 
                     element.border?.borderOpacity ?? 
                     (themeDefaults.borderOpacity ?? 1);
        }
        case 'element-background-color': {
          const themeDefaults = getThemeDefaults();
              return element.backgroundOpacity ?? 
                     element.questionSettings?.backgroundOpacity ?? 
                     element.answerSettings?.backgroundOpacity ?? 
                     element.background?.backgroundOpacity ?? 
                     (themeDefaults.backgroundOpacity ?? 1);
        }
        case 'element-ruled-lines-color': {
          return element.ruledLinesOpacity ?? 1;
        }
        default:
          return 1;
      }
    };
    
    const handleElementOpacityChange = (opacity: number) => {
      switch (localShowColorSelector) {
        case 'element-text-color':
          if (!individualSettings && sectionType === 'shared') {
            updateSharedSetting('fontOpacity', opacity);
          } else if (individualSettings && (sectionType === 'question' || activeSection === 'question')) {
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  questionSettings: {
                    ...element.questionSettings,
                    fontOpacity: opacity
                  }
                }
              }
            });
          } else {
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  answerSettings: {
                    ...element.answerSettings,
                    fontOpacity: opacity
                  }
                }
              }
            });
          }
          break;
        case 'element-border-color':
          updateSharedSetting('borderOpacity', opacity);
          break;
        case 'element-background-color':
          updateSharedSetting('backgroundOpacity', opacity);
          break;
        case 'element-ruled-lines-color':
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                // Set ruledLinesOpacity on top-level (moved from answerSettings)
                ruledLinesOpacity: opacity
              }
            }
          });
          break;
      }
    };
    
    const handleElementColorChange = (color: string) => {
      const colorValue = color || '#000000';
      
      switch (localShowColorSelector) {
        case 'element-text-color':
          if (!individualSettings && sectionType === 'shared') {
            // Shared mode: update both question and answer
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  questionSettings: {
                    ...element.questionSettings,
                    fontColor: colorValue
                  },
                  answerSettings: {
                    ...element.answerSettings,
                    fontColor: colorValue
                  }
                }
              }
            });
          } else if (individualSettings && (sectionType === 'question' || activeSection === 'question')) {
            // Individual mode: update only question
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  questionSettings: {
                    ...element.questionSettings,
                    fontColor: colorValue
                  }
                }
              }
            });
          } else {
            // Individual mode: update only answer
            dispatch({
              type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
              payload: {
                id: element.id,
                updates: {
                  answerSettings: {
                    ...element.answerSettings,
                    fontColor: colorValue
                  }
                }
              }
            });
          }
          break;
        case 'element-border-color': {
          const themeDefaults = getThemeDefaults();
          const currentEnabled = element.borderEnabled ?? (element.questionSettings?.border?.enabled || element.answerSettings?.border?.enabled) ?? (themeDefaults.borderEnabled ?? false);
          const borderWidth = element.borderWidth || element.questionSettings?.borderWidth || element.answerSettings?.borderWidth || (themeDefaults.borderWidth ?? 1);
          const borderOpacity = element.borderOpacity ?? element.questionSettings?.borderOpacity ?? element.answerSettings?.borderOpacity ?? (themeDefaults.borderOpacity ?? 1);
          const borderTheme = element.borderTheme || element.questionSettings?.borderTheme || element.answerSettings?.borderTheme || themeDefaults.borderTheme || 'default';
          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                // Set all border properties on top-level only (no border object, no nested border.enabled)
                borderEnabled: currentEnabled,
                borderColor: colorValue,
                borderWidth: borderWidth,
                borderOpacity: borderOpacity,
                borderTheme: borderTheme
              }
            }
          });
          break;
        }
        case 'element-background-color': {
          const themeDefaults = getThemeDefaults();
          const currentEnabled = element.backgroundEnabled ?? (element.questionSettings?.background?.enabled || element.answerSettings?.background?.enabled) ?? (themeDefaults.backgroundEnabled ?? false);
          const backgroundOpacity = element.backgroundOpacity ?? element.questionSettings?.backgroundOpacity ?? element.answerSettings?.backgroundOpacity ?? (themeDefaults.backgroundOpacity ?? 1);
          
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                // Set all background properties on top-level only (no background object, no nested background.enabled)
                backgroundEnabled: currentEnabled,
                backgroundColor: colorValue,
                backgroundOpacity: backgroundOpacity
              }
            }
          });
          break;
        }
        case 'element-ruled-lines-color':
          dispatch({
            type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
            payload: {
              id: element.id,
              updates: {
                // Set ruledLinesColor on top-level (moved from answerSettings)
                ruledLinesColor: colorValue
              }
            }
          });
          break;
      }
    };
    

    
    const getCurrentColorValue = () => {
      const shouldUpdateBoth = !individualSettings && sectionType === 'shared';
      const targetSection = individualSettings ? (activeSection || state.qnaActiveSection || 'question') : null;
      
      if (!individualSettings && sectionType === 'shared') {
        return element.questionSettings?.fontColor || element.answerSettings?.fontColor || '#1f2937';
      } else if (targetSection === 'question') {
        return element.questionSettings?.fontColor || '#666666';
      } else {
        return element.answerSettings?.fontColor || '#1f2937';
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
              <Tabs value={activeSection} onValueChange={(section) => {
                if (localShowColorSelector) {
                  setLocalShowColorSelector(null);
                }
                onActiveSectionChange?.(section);
              }}>
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
                      activeSection="question"
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
                      activeSection="answer"
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
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || element.paragraphSpacing || 'medium';
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
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || element.paragraphSpacing || 'medium';
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
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || element.paragraphSpacing || 'medium';
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
              return element.ruledLines ?? false;
            })()}
            onCheckedChange={(checked) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    // Set ruledLines on top-level (moved from answerSettings)
                    ruledLines: checked
                  }
                }
              });
            }}
          />
          Ruled Lines
        </Label>
      </div>
      
      {(() => {
        return element.ruledLines ?? false;
      })() && (
        <IndentedSection>
          <Slider
            label="Line Width"
            value={(() => {
              return Math.round(element.ruledLinesWidth ?? 0.8);  
            })()}
            onChange={(value) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    // Set ruledLinesWidth on top-level (moved from answerSettings)
                    ruledLinesWidth: value
                  }
                }
              });
            }}
            min={0}
            max={30}
            step={0.1}
          />
          
          <div>
            <Label variant="xs">Ruled Lines Theme</Label>
            <ThemeSelect 
              value={(() => {
                return element.ruledLinesTheme || 'rough';
              })()}
              onChange={(value) => {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: {
                      // Set ruledLinesTheme on top-level (moved from answerSettings)
                      ruledLinesTheme: value
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
              onClick={() => {
                if (individualSettings) {
                  setShowColorSelector('element-ruled-lines-color');
                } else {
                  setLocalShowColorSelector('element-ruled-lines-color');
                }
              }}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Line Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Line Opacity"
              value={Math.round(((element.ruledLinesOpacity ?? 1) * 100))}
              displayValue={Math.round(((element.ruledLinesOpacity ?? 1) * 100))}
              onChange={(value) => {
                dispatch({
                  type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                  payload: {
                    id: element.id,
                    updates: {
                      // Set ruledLinesOpacity on top-level (moved from answerSettings)
                      ruledLinesOpacity: value / 100
                    }
                  }
                });
              }}
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
      
      {/* Shared Settings - Always visible */}
      <div className='py-2'>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const themeDefaults = getThemeDefaults();
              // Border is a shared property - only check top-level element.borderEnabled
              // Fallback to questionSettings/answerSettings for backward compatibility with old data
              return element.borderEnabled ?? 
                     (element.questionSettings?.border?.enabled || element.answerSettings?.border?.enabled) ??
                     (themeDefaults.borderEnabled ?? false);
            })()}
            onCheckedChange={(checked) => updateSharedSetting('borderEnabled', checked)}
          />
          Border
        </Label>
      </div>
      
      {(() => {
        const themeDefaults = getThemeDefaults();
        // Border is a shared property - only check top-level element.borderEnabled
        // Fallback to questionSettings/answerSettings for backward compatibility with old data
        const borderEnabled = element.borderEnabled ?? 
                             (element.questionSettings?.border?.enabled || element.answerSettings?.border?.enabled) ??
                             (themeDefaults.borderEnabled ?? false);
        return borderEnabled;
      })() && (
        <IndentedSection>
          <Slider
            label="Border Width"
            value={(() => {
              const themeDefaults = getThemeDefaults();
              return element.borderWidth || 
                     element.questionSettings?.borderWidth || 
                     element.answerSettings?.borderWidth || 
                     (element.border?.borderWidth ?? (themeDefaults.borderWidth ?? 1));
            })()}
            onChange={(value) => updateSharedSetting('borderWidth', value)}
            min={0}
            max={50}
            step={1}
          />
          
          <div>
            <Label variant="xs">Border Theme</Label>
            <ThemeSelect 
              value={(() => {
                const themeDefaults = getThemeDefaults();
                return element.borderTheme || 
                       element.questionSettings?.borderTheme || 
                       element.answerSettings?.borderTheme || 
                       element.border?.borderTheme || 
                       themeDefaults.borderTheme || 
                       'default';
              })()}
              onChange={(value) => updateSharedSetting('borderTheme', value)}
            />
          </div>
          
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                if (individualSettings) {
                  setShowColorSelector('element-border-color');
                } else {
                  setLocalShowColorSelector('element-border-color');
                }
              }}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Border Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Border Opacity"
              value={Math.round(((() => {
                const themeDefaults = getThemeDefaults();
                return element.borderOpacity ?? 
                       element.questionSettings?.borderOpacity ?? 
                       element.answerSettings?.borderOpacity ?? 
                       element.border?.borderOpacity ?? 
                       (themeDefaults.borderOpacity ?? 1);
              })()) * 100)}
              displayValue={Math.round(((() => {
                const themeDefaults = getThemeDefaults();
                return element.borderOpacity ?? 
                       element.questionSettings?.borderOpacity ?? 
                       element.answerSettings?.borderOpacity ?? 
                       element.border?.borderOpacity ?? 
                       (themeDefaults.borderOpacity ?? 1);
              })()) * 100)}
              onChange={(value) => updateSharedSetting('borderOpacity', value / 100)}
              min={0}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
            />
          </div>
        </IndentedSection>
      )}
      
      <div>
        <Label className="flex items-center gap-1" variant="xs">
          <Checkbox
            checked={(() => {
              const themeDefaults = getThemeDefaults();
              // Background is a shared property - only check top-level element.backgroundEnabled
              // Fallback to questionSettings/answerSettings for backward compatibility with old data
              return element.backgroundEnabled ?? 
                     (element.questionSettings?.background?.enabled || element.answerSettings?.background?.enabled) ??
                     (themeDefaults.backgroundEnabled ?? false);
            })()}
            onCheckedChange={(checked) => updateSharedSetting('backgroundEnabled', checked)}
          />
          Background
        </Label>
      </div>
      
      {(() => {
        const themeDefaults = getThemeDefaults();
        // Background is a shared property - only check top-level element.backgroundEnabled
        // Fallback to questionSettings/answerSettings for backward compatibility with old data
        const backgroundEnabled = element.backgroundEnabled ?? 
                                  (element.questionSettings?.background?.enabled || element.answerSettings?.background?.enabled) ??
                                  (themeDefaults.backgroundEnabled ?? false);
        return backgroundEnabled;
      })() && (
        <IndentedSection>
          <div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                if (individualSettings) {
                  setShowColorSelector('element-background-color');
                } else {
                  setLocalShowColorSelector('element-background-color');
                }
              }}
              className="w-full"
            >
              <Palette className="w-4 mr-2" />
              Background Color
            </Button>
          </div>
          
          <div>
            <Slider
              label="Background Opacity"
              value={Math.round(((() => {
                const themeDefaults = getThemeDefaults();
                return element.backgroundOpacity ?? 
                       element.questionSettings?.backgroundOpacity ?? 
                       element.answerSettings?.backgroundOpacity ?? 
                       element.background?.backgroundOpacity ?? 
                       (themeDefaults.backgroundOpacity ?? 1);
              })()) * 100)}
              displayValue={Math.round(((() => {
                const themeDefaults = getThemeDefaults();
                return element.backgroundOpacity ?? 
                       element.questionSettings?.backgroundOpacity ?? 
                       element.answerSettings?.backgroundOpacity ?? 
                       element.background?.backgroundOpacity ?? 
                       (themeDefaults.backgroundOpacity ?? 1);
              })()) * 100)}
              onChange={(value) => updateSharedSetting('backgroundOpacity', value / 100)}
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
              value={(() => {
                const themeDefaults = getThemeDefaults();
                const actualRadius = element.cornerRadius ?? themeDefaults.cornerRadius ?? 0;
                return actualToCommonRadius(actualRadius);
              })()}              
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
                // Priority: questionSettings.padding > answerSettings.padding > element.padding (from layout) > default
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                return qSettings.padding || aSettings.padding || element.padding || element.format?.padding || 4;
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
                const align = qSettings.align || aSettings.align || element.format?.textAlign || element.align || 'left';
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
                const align = qSettings.align || aSettings.align || element.format?.textAlign || element.align || 'left';
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
                const align = qSettings.align || aSettings.align || element.format?.textAlign || element.align || 'left';
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
                const align = qSettings.align || aSettings.align || element.format?.textAlign || element.align || 'left';
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