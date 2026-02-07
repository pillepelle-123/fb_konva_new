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
import { getQnAThemeDefaults, getQnAInlineThemeDefaults, getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getMinActualStrokeWidth, commonToActualStrokeWidth, actualToCommonStrokeWidth, getMaxCommonWidth } from '../../../../utils/stroke-width-converter';
import { getBorderTheme } from '../../../../utils/theme-utils';
import { ThemeSettingsRenderer } from './theme-settings-renderer';
import { useSettingsFormState } from '../../../../hooks/useSettingsFormState';
import { SettingsFormFooter } from './settings-form-footer';

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

interface QnASettingsFormProps {
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

export function QnASettingsForm({
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
}: QnASettingsFormProps) {
  const { dispatch } = useEditor();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const { hasChanges, handleSave, handleDiscard } = useSettingsFormState(element);
  
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
    const qnaThemeDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'question') : {};

    // Get tool defaults for qna to use as fallback
    const pageLayoutTemplateId = currentPage?.layoutTemplateId;
    const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
    const toolDefaults = getGlobalThemeDefaults(activeTheme, 'qna', undefined);
    const qnaDefaults = toolDefaults.questionSettings || {};
    
    return {
      fontSize: qStyle.fontSize ?? qnaThemeDefaults?.fontSize ?? qnaDefaults.fontSize ?? 58,
      fontFamily: qStyle.fontFamily || qnaThemeDefaults?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: qStyle.fontBold ?? qnaThemeDefaults?.fontBold ?? qnaDefaults.fontBold ?? false,
      fontItalic: qStyle.fontItalic ?? qnaThemeDefaults?.fontItalic ?? qnaDefaults.fontItalic ?? false,
      fontColor: qStyle.fontColor || qnaThemeDefaults?.fontColor || qnaDefaults.fontColor || '#666666',
      fontOpacity: qStyle.fontOpacity ?? 1,
      align: qStyle.align || element.format?.textAlign || element.align || qnaThemeDefaults?.align || qnaDefaults.align || 'left',
      ruledLines: qStyle.ruledLines ?? qnaThemeDefaults?.ruledLines ?? qnaDefaults.ruledLines ?? false
    };
  };
  
  const getAnswerStyle = () => {
    const aStyle = element.answerSettings || {};
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    const qnaThemeDefaults = activeTheme ? getQnAThemeDefaults(activeTheme, 'answer') : {};

    // Get tool defaults for qna to use as fallback
    const pageLayoutTemplateId = currentPage?.layoutTemplateId;
    const bookLayoutTemplateId = state.currentBook?.layoutTemplateId;
    const toolDefaults = getGlobalThemeDefaults(activeTheme, 'qna', undefined);
    const qnaDefaults = toolDefaults.answerSettings || {};
    
    return {
      fontSize: aStyle.fontSize ?? qnaThemeDefaults?.fontSize ?? qnaDefaults.fontSize ?? 50,
      fontFamily: aStyle.fontFamily || qnaThemeDefaults?.fontFamily || qnaDefaults.fontFamily || 'Arial, sans-serif',
      fontBold: aStyle.fontBold ?? qnaThemeDefaults?.fontBold ?? qnaDefaults.fontBold ?? false,
      fontItalic: aStyle.fontItalic ?? qnaThemeDefaults?.fontItalic ?? qnaDefaults.fontItalic ?? false,
      fontColor: aStyle.fontColor || qnaThemeDefaults?.fontColor || qnaDefaults.fontColor || '#1f2937',
      fontOpacity: aStyle.fontOpacity ?? 1,
      align: aStyle.align || element.format?.textAlign || element.align || qnaThemeDefaults?.align || qnaDefaults.align || 'left',
      ruledLines: aStyle.ruledLines ?? qnaThemeDefaults?.ruledLines ?? qnaDefaults.ruledLines ?? false
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
    const activeTheme = pageTheme || bookTheme || 'default';
    return getGlobalThemeDefaults(activeTheme, 'qna', undefined);
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
      // When border theme changes, set borderWidth to minimum value of new theme
      const minWidth = getMinActualStrokeWidth(value);
      const borderOpacity = element.borderOpacity ?? element.questionSettings?.borderOpacity ?? element.answerSettings?.borderOpacity ?? (themeDefaults.borderOpacity ?? 1);
      
      // Only set on top-level (only individual properties, no border object)
      updates.borderTheme = value;
      // Only update borderWidth if border is enabled
      const currentBorderWidth = element.borderWidth || element.questionSettings?.borderWidth || element.answerSettings?.borderWidth || 0;
      if (currentBorderWidth > 0) {
        updates.borderWidth = minWidth;
      } else {
        updates.borderWidth = currentBorderWidth;
      }
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
    
    // // Debug logging
    // console.log('[qna-inline-settings-form] renderFontControls:', {
    //   elementId: element.id,
    //   textType: element.textType,
    //   individualSettings,
    //   sectionType,
    //   activeSection,
    //   elementQuestionSettings: element.questionSettings,
    //   elementAnswerSettings: element.answerSettings,
    //   computedQuestionStyle: computedQuestionStyle,
    //   computedAnswerStyle: computedAnswerStyle,
    //   currentStyle,
    //   displayStyle,
    //   displayStyleFontSize: displayStyle.fontSize,
    //   actualToCommonResult: actualToCommon(displayStyle.fontSize || 16)
    // });
    
    return (
      <>
        <div>
          <div className="flex gap-2">
            <Tooltip content="Bold" side="left">
              <Button
                variant={displayStyle.fontBold ? 'default' : 'outline'}
                size="xxs"
                onClick={() => {
                  // Nur fontBold aktualisieren - CSS font-weight wird verwendet, Font-Familie bleibt unverändert
                  updateFn('fontBold', !displayStyle.fontBold);
                }}
                className="px-3 flex-shrink-0"
              >
                <strong>B</strong>
              </Button>
            </Tooltip>
            <Tooltip content="Italic" side="left">
              <Button
                variant={displayStyle.fontItalic ? 'default' : 'outline'}
                size="xxs"
                onClick={() => {
                  // Nur fontItalic aktualisieren - CSS font-style wird verwendet, Font-Familie bleibt unverändert
                  updateFn('fontItalic', !displayStyle.fontItalic);
                }}
                className="px-3 flex-shrink-0"
              >
                <em>I</em>
              </Button>
            </Tooltip>
            <div className="flex-1">
              <Tooltip content={`Font: ${getCurrentFontName(displayStyle.fontFamily)}`} side="left">
                <Button
                  variant="outline"
                  size="xxs"
                  onClick={() => setShowFontSelector(true)}
                  className="w-full justify-start"
                  style={{ fontFamily: displayStyle.fontFamily }}
                >
                  <Type className="h-4 w-4 mr-2" />
                  <span className="truncate">{getCurrentFontName(displayStyle.fontFamily)}</span>
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
        
        <div className="flex flex-row gap-2 py-2 w-full">
          <Tooltip content="Font Size" side="left">
            <ALargeSmall className='w-5 h-5 flex-shrink-0'/>
          </Tooltip>
          <div className='flex-1 min-w-0'>
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
        
        <div>
          <Tooltip content="Font Color" side="left">
            <Button
              variant="outline"
              size="xxs"
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
          </Tooltip>
        </div>
        
        <div className='flex flex-row gap-2 py-2 w-full'>
          <Tooltip content="Font Opacity" side="left" fullWidth={true}>
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
          </Tooltip>
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
            updateSharedSetting('fontColor', colorValue);
          } else if (individualSettings && (sectionType === 'question' || activeSection === 'question')) {
            (updateQuestionSetting || updateSetting)('fontColor', colorValue);
          } else {
            (updateAnswerSetting || updateSetting)('fontColor', colorValue);
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
  
  // Helper function to render Text Align ButtonGroup for individual settings
  const renderTextAlignControls = () => {
    const isQuestion = sectionType === 'question';
    const settings = isQuestion ? (element.questionSettings || {}) : (element.answerSettings || {});
    const currentAlign = settings.align || element.format?.textAlign || element.align || 'left';
    const updateFn = isQuestion ? (updateQuestionSetting || updateSetting) : (updateAnswerSetting || updateSetting);
    
    return (
      <>
        {/* <Separator/> */}
        <div className='flex flex-row gap-3'>
          <div className="flex-1 py-2">
            <Tooltip content="Text Align" side="left" fullWidth={true}>
              <ButtonGroup className="flex flex-row">
              <Button
                variant={currentAlign === 'left' ? 'default' : 'outline'}
                size="xxs"
                onClick={() => updateFn('align', 'left')}
                className="px-1 h-6 flex-1"
              >
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button
                variant={currentAlign === 'center' ? 'default' : 'outline'}
                size="xxs"
                onClick={() => updateFn('align', 'center')}
                className="px-1 h-6 flex-1"
              >
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button
                variant={currentAlign === 'right' ? 'default' : 'outline'}
                size="xxs"
                onClick={() => updateFn('align', 'right')}
                className="px-1 h-6 flex-1"
              >
                <AlignRight className="h-3 w-3" />
              </Button>
              <Button
                variant={currentAlign === 'justify' ? 'default' : 'outline'}
                size="xxs"
                onClick={() => updateFn('align', 'justify')}
                className="px-1 h-6 flex-1"
              >
                <AlignJustify className="h-3 w-3" />
              </Button>
            </ButtonGroup>
            </Tooltip>
          </div>
        </div>
      </>
    );
  };
  
  // For individual tabs, show font controls and Text Align (if block layout)
  // No footer for individual tabs
  if (sectionType !== 'shared' && individualSettings) {
    return (
      <>
        {renderFontControls()}
        {/* Show Text Align at the bottom for block layout with individual settings */}
        {(element.layoutVariant || 'inline') === 'block' && renderTextAlignControls()}
      </>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {/* Layout controls - only show when requested */}
      {showLayoutControls && (
        <>
          <div className="space-y-1">
            <Tooltip content="Layout" side="left" fullWidth={true}>
              <ButtonGroup className="w-full">
              <Button
                variant={(element.layoutVariant || 'inline') === 'inline' ? 'default' : 'outline'}
                size="xxs"
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
                size="xxs"
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
            </Tooltip>
          </div>
          
          {/* Question Position (only for block layout) */}
          {element.layoutVariant === 'block' && (
            <>
              <div className="flex flex-row items-start">
                <div className="flex-1 pr-2">
                  <Tooltip content="Question Position" side="left" fullWidth={true}>
                    <ButtonGroup className="w-full">
                    <Button
                      variant={(element.questionPosition || 'left') === 'left' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: element.id,
                            updates: { questionPosition: 'left' }
                          }
                        });
                      }}
                      className="w-full p-0"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={(element.questionPosition || 'left') === 'top' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: element.id,
                            updates: { questionPosition: 'top' }
                          }
                        });
                      }}
                      className="w-full p-0"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={(element.questionPosition || 'left') === 'right' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => {
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: element.id,
                            updates: { questionPosition: 'right' }
                          }
                        });
                      }}
                      className="w-full p-0"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </ButtonGroup>
                  </Tooltip>
                </div>

                <div className='flex-1'>
              
                {/* Question Width Slider (only for left/right positions) */}
                {((element.questionPosition || 'left') === 'left' || (element.questionPosition || 'left') === 'right') && (
                  <div className="flex-1 mb-2 min-w-0">
                    <Tooltip content="Question Width" side="left" fullWidth={true}>
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
                    </Tooltip>
                  </div>
                )}
                
                {/* Question-Answer Gap Slider */}
                <div className="flex-1 min-w-0">
                  <Tooltip content="Gap between Question and Answer" side="left" fullWidth={true}>
                    <Slider
                      label="Gap between Question and Answer"
                      value={Math.round((element.blockQuestionAnswerGap ?? 20) / 2)}
                      onChange={(value) => {
                        dispatch({
                          type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                          payload: {
                            id: element.id,
                            updates: { blockQuestionAnswerGap: value * 2 }
                          }
                        });
                      }}
                      min={0}
                      max={100}
                      step={1}
                      unit=""
                      hasLabel={false}
                      displayValue={Math.round((element.blockQuestionAnswerGap ?? 20) / 2)}
                      className="w-full"
                    />
                  </Tooltip>
                </div>
              </div>
              </div>	
            </>
          )}
          
        </>
      )}
      
      {/* Answer layout controls - only show for shared mode and inline layout */}
      {sectionType === 'shared' && (element.layoutVariant || 'inline') !== 'block' && (
        <div className="flex flex-row gap-3 mb-2">
          {/* Answer in new row checkbox */}
          <div className="flex items-center gap-2 flex-1">
            <Tooltip content="Answer in new row" side="left">
              <Checkbox
                checked={element.answerInNewRow ?? false}
                onCheckedChange={(checked) => {
                  const updates: any = {
                    answerInNewRow: checked
                  };
                  
                  // Get current gap value based on CURRENT mode (before switching)
                  const currentModeIsVertical = element.answerInNewRow ?? false;
                  
                  if (currentModeIsVertical) {
                    // Currently in vertical mode, switching to horizontal
                    // Save current vertical gap value
                    const currentVerticalGap = element.questionAnswerGapVertical ?? element.questionAnswerGap ?? 0;
                    updates.questionAnswerGapVertical = currentVerticalGap;
                    // Restore horizontal gap (or use 0 if not set)
                    updates.questionAnswerGap = element.questionAnswerGapHorizontal ?? 0;
                  } else {
                    // Currently in horizontal mode, switching to vertical
                    // Save current horizontal gap value
                    const currentHorizontalGap = element.questionAnswerGapHorizontal ?? element.questionAnswerGap ?? 0;
                    updates.questionAnswerGapHorizontal = currentHorizontalGap;
                    // Restore vertical gap (or use 0 if not set)
                    updates.questionAnswerGap = element.questionAnswerGapVertical ?? 0;
                  }
                  
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates
                    }
                  });
                }}
              />
            </Tooltip>
            <Label variant="xs" className="text-xs font-medium">
              Answer in new row
            </Label>
          </div>
          
          {/* Gap between Question and Answer slider */}
          <div className="flex-1">
            <Tooltip 
              content={element.answerInNewRow 
                ? "Vertical gap between Question and Answer" 
                : "Horizontal gap between Question and Answer"} 
              side="left"
              fullWidth={true}
            >
              <Slider
                label={element.answerInNewRow 
                  ? "Vertical gap between Question and Answer" 
                  : "Horizontal gap between Question and Answer"}
                value={Math.round(((() => {
                  // Get the appropriate gap value based on current mode and convert to display value
                  const gapValue = element.answerInNewRow 
                    ? (element.questionAnswerGapVertical ?? element.questionAnswerGap ?? 0)
                    : (element.questionAnswerGapHorizontal ?? element.questionAnswerGap ?? 0);
                  return gapValue / 2;
                })()))}
                onChange={(value) => {
                  const actualValue = value * 2; // Convert display value to internal value
                  const updates: any = {
                    questionAnswerGap: actualValue
                  };
                  
                  // Also save to the appropriate property based on current mode
                  if (element.answerInNewRow) {
                    updates.questionAnswerGapVertical = actualValue;
                  } else {
                    updates.questionAnswerGapHorizontal = actualValue;
                  }
                  
                  dispatch({
                    type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                    payload: {
                      id: element.id,
                      updates
                    }
                  });
                }}
                min={0}
                max={100}
                step={1}
                unit=""
                hasLabel={false}
                displayValue={Math.round(((() => {
                  // Get the appropriate gap value for display
                  if (element.answerInNewRow) {
                    return element.questionAnswerGapVertical ?? element.questionAnswerGap ?? 0;
                  } else {
                    return element.questionAnswerGapHorizontal ?? element.questionAnswerGap ?? 0;
                  }
                })() ?? 20) / 2)}
              />
            </Tooltip>
          </div>
        </div>
      )}

      <Separator/>
      
      {/* Individual settings checkbox - only show for shared mode */}
      {sectionType === 'shared' && onIndividualSettingsChange && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Tooltip content="Individual for Question and Answer" side="left">
              <div className="flex items-center gap-2">
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
            </Tooltip>
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
                    <QnASettingsForm
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
                    <QnASettingsForm
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
      
      {/* Text Align - combined for inline layout OR block layout without individual settings */}
      {((element.layoutVariant || 'inline') === 'inline' || ((element.layoutVariant || 'inline') === 'block' && !individualSettings)) && (
        <div className='flex flex-row gap-3'>
          <div className="flex-1 py-2">
            <Tooltip content="Text Align" side="left" fullWidth={true}>
              <ButtonGroup className="flex flex-row">
              {(() => {
                // Use the same priority order as textbox-qna.tsx: element.align || element.format?.textAlign || questionSettings.align || answerSettings.align
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const currentAlign = element.align || element.format?.textAlign || qSettings.align || aSettings.align || 'left';
                
                return [
                    <Button
                    key="left"
                      variant={currentAlign === 'left' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => updateSharedSetting('align', 'left')}
                      className="px-1 h-6 flex-1"
                    >
                      <AlignLeft className="h-3 w-3" />
                  </Button>,
                    <Button
                    key="center"
                      variant={currentAlign === 'center' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => updateSharedSetting('align', 'center')}
                      className="px-1 h-6 flex-1"
                    >
                      <AlignCenter className="h-3 w-3" />
                  </Button>,
                    <Button
                    key="right"
                      variant={currentAlign === 'right' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => updateSharedSetting('align', 'right')}
                      className="px-1 h-6 flex-1"
                    >
                      <AlignRight className="h-3 w-3" />
                  </Button>,
                    <Button
                    key="justify"
                      variant={currentAlign === 'justify' ? 'default' : 'outline'}
                      size="xxs"
                      onClick={() => updateSharedSetting('align', 'justify')}
                      className="px-1 h-6 flex-1"
                    >
                      <AlignJustify className="h-3 w-3" />
                    </Button>
                ];
              })()}
            </ButtonGroup>
            </Tooltip>
          </div>
        </div>
      )}
      
      {/* Paragraph Spacing - always universal */}
      <div className='flex flex-row gap-3'>
        <div className="flex-1 py-2">
          <Tooltip content="Paragraph Spacing" side="left" fullWidth={true}>
            <ButtonGroup className="flex flex-row">
            <Button
              variant={(() => {
                const qSettings = element.questionSettings || {};
                const aSettings = element.answerSettings || {};
                const spacing = qSettings.paragraphSpacing || aSettings.paragraphSpacing || element.paragraphSpacing || 'medium';
                return spacing === 'small' ? 'default' : 'outline';
              })()}
              size="xxs"
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
              size="xxs"
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
              size="xxs"
              onClick={() => updateSharedSetting('paragraphSpacing', 'large')}
              className="px-1 h-6 flex-1"
            >
              <Rows2 className="h-3 w-3" />
            </Button>
          </ButtonGroup>
          </Tooltip>
        </div>
      </div>
      
      <Separator/>
      
      {/* Ruled Lines - Common Settings */}
      <div className='py-2'>
        <div className="flex items-center gap-2">
          <Tooltip content="Ruled Lines" side="left">
            <Label className="flex items-center gap-1" variant="xs">
              <Checkbox
                checked={Boolean(element.ruledLines)}
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
          </Tooltip>
          
          {/* Ruled Lines Target (only for block layout) */}
          {/* {(element.layoutVariant || 'inline') === 'block' && (element.ruledLines ?? false) && (
            <div className="flex-1">
              <Tooltip content="Ruled Lines Target" side="left" fullWidth={true}>
                <ButtonGroup className="w-full">
                  <Button
                    variant={(element.ruledLinesTarget || 'answer') === 'question' ? 'default' : 'outline'}
                    size="xxs"
                    onClick={() => {
                      dispatch({
                        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                        payload: {
                          id: element.id,
                          updates: { ruledLinesTarget: 'question' }
                        }
                      });
                    }}
                    className="flex-1"
                  >
                    Question
                  </Button>
                  <Button
                    variant={(element.ruledLinesTarget || 'answer') === 'answer' ? 'default' : 'outline'}
                    size="xxs"
                    onClick={() => {
                      dispatch({
                        type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                        payload: {
                          id: element.id,
                          updates: { ruledLinesTarget: 'answer' }
                        }
                      });
                    }}
                    className="flex-1"
                  >
                    Answer
                  </Button>
                </ButtonGroup>
              </Tooltip>
            </div>
          )} */}
        </div>
      </div>
      
      {(() => {
        return element.ruledLines ?? false;
      })() && (
        <IndentedSection>
          <div className="min-w-0">
            <Tooltip content="Line Width" side="left" fullWidth={true}>
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
                min={1}
                max={30}
                step={0.3}
                className="w-full"
              />
            </Tooltip>
          </div>
          
          <div>
            <Tooltip content="Ruled Lines Theme" side="left">
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
            </Tooltip>
          </div>
          
          {/* Theme-specific settings for Ruled Lines */}
          <ThemeSettingsRenderer
            element={element}
            theme={element.ruledLinesTheme || 'rough'}
            updateSetting={(key, value) => {
              dispatch({
                type: 'UPDATE_ELEMENT_PRESERVE_SELECTION',
                payload: {
                  id: element.id,
                  updates: {
                    [key]: value
                  }
                }
              });
            }}
          />
          
          <div>
            <Tooltip content="Line Color" side="left">
              <Button
                variant="outline"
                size="xxs"
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
            </Tooltip>
          </div>
          
          <div className="min-w-0">
            <Tooltip content="Line Opacity" side="left" fullWidth={true}>
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
              className="w-full"
            />
            </Tooltip>
          </div>
        </IndentedSection>
      )}
      
      <Separator/>
      
      {/* Shared Settings - Always visible */}
      <div className='py-2'>
        <Tooltip content="Border" side="left">
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
        </Tooltip>
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
          <div className="min-w-0">
            <Tooltip content="Border Width" side="left" fullWidth={true}>
              <Slider
                label="Border Width"
                value={(() => {
                  const themeDefaults = getThemeDefaults();
                  const currentBorderWidth = element.borderWidth || 
                         element.questionSettings?.borderWidth || 
                         element.answerSettings?.borderWidth || 
                         (element.border?.borderWidth ?? (themeDefaults.borderWidth ?? 1));
                  const borderTheme = element.borderTheme || 
                         element.questionSettings?.borderTheme || 
                         element.answerSettings?.borderTheme || 
                         element.border?.borderTheme || 
                         themeDefaults.borderTheme || 
                         'default';
                  // Convert actual width to common scale (0-100) for the slider
                  return actualToCommonStrokeWidth(currentBorderWidth, borderTheme);
                })()}
                onChange={(value) => {
                  const themeDefaults = getThemeDefaults();
                  const borderTheme = element.borderTheme || 
                         element.questionSettings?.borderTheme || 
                         element.answerSettings?.borderTheme || 
                         element.border?.borderTheme || 
                         themeDefaults.borderTheme || 
                         'default';
                  // Convert common scale (0-100) back to actual theme-specific width
                  const actualWidth = commonToActualStrokeWidth(value, borderTheme);
                  updateSharedSetting('borderWidth', actualWidth);
                }}
                min={1}
                max={getMaxCommonWidth()}
                step={1}
                className="w-full"
              />
            </Tooltip>
          </div>
          
          <div>
            <Tooltip content="Border Theme" side="left">
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
            </Tooltip>
          </div>
          
          {/* Theme-specific settings for Border */}
          <ThemeSettingsRenderer
            element={element}
            theme={(() => {
              const themeDefaults = getThemeDefaults();
              return element.borderTheme || 
                     element.questionSettings?.borderTheme || 
                     element.answerSettings?.borderTheme || 
                     element.border?.borderTheme || 
                     themeDefaults.borderTheme || 
                     'default';
            })()}
            updateSetting={(key, value) => updateSharedSetting(key, value)}
          />
          
          <div>
            <Tooltip content="Border Color" side="left">
              <Button
                variant="outline"
                size="xxs"
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
            </Tooltip>
          </div>
          
          <div className="min-w-0">
            <Tooltip content="Border Opacity" side="left" fullWidth={true}>
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
              className="w-full"
            />
            </Tooltip>
          </div>
        </IndentedSection>
      )}
      
      <div>
        <Tooltip content="Background" side="left">
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
        </Tooltip>
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
            <Tooltip content="Background Color" side="left">
              <Button
                variant="outline"
                size="xxs"
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
            </Tooltip>
          </div>
          
          <div className="min-w-0">
            <Tooltip content="Background Opacity" side="left" fullWidth={true}>
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
              min={5}
              max={100}
              step={5}
              unit="%"
              hasLabel={false}
              className="w-full"
            />
            </Tooltip>
          </div>
        </IndentedSection>
      )}

      <div className="flex flex-row gap-2 py-2 w-full">
        <Tooltip content="Corner Radius" side="left">
          <SquareRoundCorner className='w-5 h-5 flex-shrink-0'/>
        </Tooltip>
        <div className='flex-1 min-w-0'>
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
      
      <div className="flex flex-row gap-2 py-2 w-full">
        <Tooltip content="Padding" side="left">
          <PanelTopBottomDashed className='w-5 h-5 flex-shrink-0'/>
        </Tooltip>
        <div className='flex-1 min-w-0'>
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
              max={100}
              step={1}
              className='w-full'
            />
        </div>
      </div>
      </div>
      
      <SettingsFormFooter
        hasChanges={hasChanges}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}