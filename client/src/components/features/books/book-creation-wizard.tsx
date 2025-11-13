import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { colorPalettes } from '../../../data/templates/color-palettes';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../../utils/global-themes';
import { getToolDefaults } from '../../../utils/tool-defaults';
import type { PageTemplate, ColorPalette, QuickTemplate } from '../../../types/template-types';
import { convertTemplateToElements } from '../../../utils/template-to-elements';
import { getBackgroundImagesWithUrl } from '../../../data/templates/background-images';
import { applyBackgroundImageTemplate } from '../../../utils/background-image-utils';
import { LayoutSelector } from '../editor/templates/layout-selector';
import { ThemeSelector } from '../editor/templates/theme-selector';
import { WizardPaletteSelector } from '../editor/templates/wizard-palette-selector';
import { calculatePageDimensions } from '../../../utils/template-utils';

const tempBooks = new Map();

interface BookCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface WizardState {
  name: string;
  pageSize: string;
  orientation: string;
  mode: 'quick' | 'advanced' | null;
  selectedTemplate: PageTemplate | null;
  selectedTheme: string;
  selectedPalette: ColorPalette | null;
}


export default function BookCreationWizard({ open, onOpenChange, onSuccess }: BookCreationWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>({
    name: '',
    pageSize: 'A4',
    orientation: 'portrait',
    mode: null,
    selectedTemplate: null,
    selectedTheme: 'default',
    selectedPalette: colorPalettes[0]
  });

  // Steps abhängig vom Modus
  const totalSteps = wizardState.mode === 'quick' ? 4 : wizardState.mode === 'advanced' ? 6 : 6;

  const updateState = (updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return wizardState.name.trim().length > 0;
    if (currentStep === 2) return wizardState.mode !== null;
    return true;
  };

  const handleFinish = async () => {
    const tempId = `temp_${Date.now()}`;
    
    // Bestimme finale Werte basierend auf Modus
    const finalTheme = wizardState.selectedTheme || 'default';
    const finalPalette = wizardState.selectedPalette || colorPalettes[0];
    const template = wizardState.selectedTemplate;
    
    // Quick Mode: Nutze Template-Metadaten wenn vorhanden
    // Advanced Mode: Nutze manuell ausgewähltes Theme/Palette, Template-Metadaten nur als Fallback
    const quickTemplate = template as QuickTemplate;
    
    let paletteToUse: ColorPalette;
    let themeToUse: string;
    
    if (wizardState.mode === 'quick') {
      // Quick Mode: Template-Metadaten haben Priorität
      // Note: Layout templates no longer have theme property - use selected theme
      paletteToUse = quickTemplate?.paletteId 
        ? colorPalettes.find(p => p.id === quickTemplate.paletteId) || finalPalette
        : finalPalette;
      themeToUse = finalTheme; // Layout templates don't have theme - use selected theme
    } else {
      // Advanced Mode: Manuell ausgewähltes Theme/Palette hat Priorität
      // Verwende finalTheme direkt (nicht template?.theme), da der Benutzer explizit ein Theme ausgewählt hat
      themeToUse = finalTheme;
      paletteToUse = finalPalette;
    }
    
    // Debug logging (kann später entfernt werden)
    console.log('Wizard finish:', {
      mode: wizardState.mode,
      selectedTheme: wizardState.selectedTheme,
      finalTheme,
      themeToUse
    });
    
    // Berechne Canvas-Größe basierend auf Seitengröße und Ausrichtung
    const canvasSize = calculatePageDimensions(wizardState.pageSize, wizardState.orientation);
    
    // Erstelle Elemente aus Template (falls Template gewählt)
    // WICHTIG: Übergebe canvasSize für korrekte Skalierung
    let elements = template ? convertTemplateToElements(template, canvasSize) : [];
    const layoutTemplateId = template?.id || null;
    const activePaletteId = paletteToUse?.id || null;

    if (elements.length > 0) {
      const styleElementWithThemeAndPalette = (element: any) => {
        const toolType = element.textType || element.type;
        const defaults = getToolDefaults(
          toolType as any,
          themeToUse || undefined,
          themeToUse || undefined,
          element,
          undefined,
          layoutTemplateId,
          layoutTemplateId,
          activePaletteId,
          activePaletteId
        );

        // Preserve essential element properties
        const preservedProps = {
          id: element.id,
          type: element.type,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          text: element.text,
          formattedText: element.formattedText,
          textType: element.textType,
          questionId: element.questionId,
          answerId: element.answerId,
          questionElementId: element.questionElementId,
          src: element.src,
          points: element.points
        };

        // Build updated element with all theme/palette properties explicitly set
        const updatedElement: any = {
          ...preservedProps,
          // Apply all defaults from theme/palette
          ...defaults,
          // Explicitly set theme property
          theme: themeToUse || defaults.theme || element.theme
        };

        // For qna_inline: Ensure questionSettings and answerSettings are fully populated
        if (element.textType === 'qna_inline') {
          // Deep merge questionSettings to ensure all properties are present
          updatedElement.questionSettings = {
            ...(defaults.questionSettings || {}),
            ...(element.questionSettings || {}),
            // Ensure nested objects are fully merged
            font: {
              ...(defaults.questionSettings?.font || {}),
              ...(element.questionSettings?.font || {})
            },
            border: {
              ...(defaults.questionSettings?.border || {}),
              ...(element.questionSettings?.border || {})
            },
            background: {
              ...(defaults.questionSettings?.background || {}),
              ...(element.questionSettings?.background || {})
            }
          };
          
          // Deep merge answerSettings to ensure all properties are present
          updatedElement.answerSettings = {
            ...(defaults.answerSettings || {}),
            ...(element.answerSettings || {}),
            // Ensure nested objects are fully merged
            font: {
              ...(defaults.answerSettings?.font || {}),
              ...(element.answerSettings?.font || {})
            },
            border: {
              ...(defaults.answerSettings?.border || {}),
              ...(element.answerSettings?.border || {})
            },
            background: {
              ...(defaults.answerSettings?.background || {}),
              ...(element.answerSettings?.background || {})
            }
          };
        }

        // For free_text: Ensure textSettings is fully populated
        if (element.textType === 'free_text' && defaults.textSettings) {
          updatedElement.textSettings = {
            ...defaults.textSettings,
            ...(element.textSettings || {}),
            // Ensure nested objects are fully merged
            font: {
              ...(defaults.textSettings?.font || {}),
              ...(element.textSettings?.font || {})
            },
            border: {
              ...(defaults.textSettings?.border || {}),
              ...(element.textSettings?.border || {})
            },
            background: {
              ...(defaults.textSettings?.background || {}),
              ...(element.textSettings?.background || {})
            }
          };
        }

        // For shapes: Ensure opacity properties are set (strokeOpacity, fillOpacity)
        if (['line', 'circle', 'rect', 'triangle', 'polygon', 'heart', 'star', 'speech-bubble', 'dog', 'cat', 'smiley'].includes(element.type)) {
          // If defaults have strokeOpacity/fillOpacity, use them; otherwise preserve element values
          if (defaults.strokeOpacity !== undefined) {
            updatedElement.strokeOpacity = defaults.strokeOpacity;
          } else if (element.strokeOpacity !== undefined) {
            updatedElement.strokeOpacity = element.strokeOpacity;
          }
          
          if (defaults.fillOpacity !== undefined) {
            updatedElement.fillOpacity = defaults.fillOpacity;
          } else if (element.fillOpacity !== undefined) {
            updatedElement.fillOpacity = element.fillOpacity;
          }
        }

        // Ensure nested objects are fully populated for all element types
        if (defaults.font) {
          updatedElement.font = {
            ...defaults.font,
            ...(element.font || {})
          };
        }
        
        if (defaults.border) {
          updatedElement.border = {
            ...defaults.border,
            ...(element.border || {})
          };
        }
        
        if (defaults.background) {
          updatedElement.background = {
            ...defaults.background,
            ...(element.background || {})
          };
        }
        
        if (defaults.ruledLines) {
          updatedElement.ruledLines = {
            ...defaults.ruledLines,
            ...(element.ruledLines || {})
          };
        }

        return updatedElement;
      };

      elements = elements.map(styleElementWithThemeAndPalette);
    }

    const themeConfig = themeToUse ? getGlobalTheme(themeToUse) : null;
    const themeBackgroundColors = themeToUse ? getThemePageBackgroundColors(themeToUse, paletteToUse) : null;

    let background: {
      type: 'color' | 'pattern' | 'image';
      value: string;
      opacity: number;
      pageTheme?: string;
      backgroundImageTemplateId?: string;
      imageSize?: string;
      patternSize?: number;
      patternStrokeWidth?: number;
      patternForegroundColor?: string;
      patternBackgroundColor?: string;
      patternBackgroundOpacity?: number;
    } = {
      type: 'color',
      value: paletteToUse.colors.background,
      opacity: 1,
      pageTheme: themeToUse
    };

    if (themeConfig) {
      if (themeConfig.pageSettings.backgroundPattern?.enabled) {
        background = {
          type: 'pattern',
          value: themeConfig.pageSettings.backgroundPattern.style,
          opacity: themeConfig.pageSettings.backgroundOpacity || 1,
          pageTheme: themeToUse,
          patternSize: themeConfig.pageSettings.backgroundPattern.size,
          patternStrokeWidth: themeConfig.pageSettings.backgroundPattern.strokeWidth,
          patternForegroundColor: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background,
          patternBackgroundColor: themeBackgroundColors?.patternBackgroundColor || paletteToUse.colors.primary || paletteToUse.colors.background,
          patternBackgroundOpacity: themeConfig.pageSettings.backgroundPattern.patternBackgroundOpacity
        };
      } else {
        background = {
          type: 'color',
          value: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background,
          opacity: themeConfig.pageSettings.backgroundOpacity || 1,
          pageTheme: themeToUse
        };
      }

      if (themeConfig.pageSettings.backgroundImage?.enabled && themeConfig.pageSettings.backgroundImage.templateId) {
        const imageConfig = themeConfig.pageSettings.backgroundImage;
        const templateId = imageConfig.templateId;
        if (!templateId) {
          console.warn('Background image enabled but templateId is missing');
        } else {
          const imageBackground = applyBackgroundImageTemplate(templateId, {
          imageSize: imageConfig.size,
          imageRepeat: imageConfig.repeat,
          imagePosition: imageConfig.position,
          imageWidth: imageConfig.width,
          opacity: imageConfig.opacity ?? background.opacity ?? 1,
          backgroundColor: themeBackgroundColors?.backgroundColor || paletteToUse.colors.background || '#ffffff'
        });

          if (imageBackground && imageBackground.value) {
            background = {
              ...imageBackground,
              opacity: imageBackground.opacity ?? imageConfig.opacity ?? background.opacity ?? 1,
              pageTheme: themeToUse
            };
          } else {
            console.warn('Failed to apply background image template:', templateId);
          }
        }
      }
    }

    // Quick Mode: Prüfe auf Background Image
    if (quickTemplate?.backgroundImageId) {
      const allBackgroundImages = getBackgroundImagesWithUrl();
      const bgImage = allBackgroundImages.find(img => img.id === quickTemplate.backgroundImageId);
      if (bgImage) {
        background = {
          type: 'image' as const,
          value: bgImage.url,
          opacity: 1,
          pageTheme: themeToUse,
          backgroundImageTemplateId: bgImage.id,
          imageSize: bgImage.defaultSize || 'cover'
        };
      }
    }
    // Layout templates no longer have background property - background is managed by themes.json and color-palettes.json
    // If no background image is set, background will be set from the active theme/palette
    
    const newBook = {
      id: tempId,
      name: wizardState.name,
      pageSize: wizardState.pageSize,
      orientation: wizardState.orientation,
      owner_id: user?.id,
      bookTheme: themeToUse,
      themeId: themeToUse, // Also set themeId for consistency
      colorPaletteId: paletteToUse.id, // Use colorPaletteId (not bookColorPaletteId) to match Book interface
      layoutTemplateId: template?.id || null,
      pages: [{
        id: Date.now(),
        pageNumber: 1,
        elements: elements,
        background: background,
        layoutTemplateId: undefined,
        database_id: undefined
      }],
      isTemporary: true,
      wizardSelections: {
        template: template,
        theme: themeToUse,
        palette: paletteToUse
      }
    };
    
    tempBooks.set(tempId, newBook);
    // @ts-expect-error - temporary storage for wizard
    window.tempBooks = tempBooks;
    
    onSuccess();
    onOpenChange(false);
    navigate(`/editor/${tempId}`);
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-between mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            i + 1 < currentStep ? 'bg-blue-500 text-white' :
            i + 1 === currentStep ? 'bg-blue-100 text-blue-600 border-2 border-blue-500' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i + 1 < currentStep ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          {i < totalSteps - 1 && (
            <div className={`w-12 h-0.5 mx-2 ${
              i + 1 < currentStep ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Basic Information</h3>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Book Name</label>
        <Input
          id="name"
          type="text"
          placeholder="Enter book name"
          value={wizardState.name}
          onChange={(e) => updateState({ name: e.target.value })}
          required
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="pageSize" className="text-sm font-medium">Page Size</label>
        <select
          id="pageSize"
          value={wizardState.pageSize}
          onChange={(e) => updateState({ pageSize: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="A3">A3</option>
          <option value="Letter">Letter</option>
          <option value="Square">Square</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Orientation</label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="portrait"
              checked={wizardState.orientation === 'portrait'}
              onChange={(e) => updateState({ orientation: e.target.value })}
            />
            <span>Portrait</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              value="landscape"
              checked={wizardState.orientation === 'landscape'}
              onChange={(e) => updateState({ orientation: e.target.value })}
            />
            <span>Landscape</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Start Mode</h3>
      <p className="text-sm text-gray-600">Wähle zwischen Quick Templates (alles in einem) oder Advanced Mode (Einzelauswahl).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => setWizardState(prev => ({ ...prev, mode: 'quick' }))}
          className={`p-4 border rounded-lg text-left transition-colors ${wizardState.mode === 'quick' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="font-medium">Quick Templates</div>
          <div className="text-sm text-gray-600 mt-1">Fertige Kombinationen: Layout, Theme, Farben. Später anpassbar.</div>
        </button>
        <button
          onClick={() => setWizardState(prev => ({ ...prev, mode: 'advanced' }))}
          className={`p-4 border rounded-lg text-left transition-colors ${wizardState.mode === 'advanced' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
        >
          <div className="font-medium">Advanced Mode</div>
          <div className="text-sm text-gray-600 mt-1">Layout, Theme und Palette separat auswählen.</div>
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    wizardState.mode === 'quick' ? (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="mb-4 shrink-0">
          <h3 className="text-lg font-semibold mb-2">Quick Templates</h3>
          <p className="text-sm text-gray-600">Wähle eine komplette Vorlage. Theme und Palette werden automatisch übernommen (später änderbar).</p>
        </div>
        <div className="flex-1 flex flex-col">
          <LayoutSelector
            selectedLayout={wizardState.selectedTemplate}
            onLayoutSelect={(template) => {
              // Layout templates no longer have theme property - theme is managed separately
              updateState({ selectedTemplate: template });
            }}
            previewPosition="right"
          />
        </div>
      </div>
    ) : (
      <div className="h-full flex flex-col min-h-0 overflow-hidden">
        <div className="mb-4 shrink-0">
          <h3 className="text-lg font-semibold mb-2">Theme Selection</h3>
          <p className="text-sm text-gray-600">Choose the visual style for your book.</p>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ThemeSelector
            selectedTheme={wizardState.selectedTheme}
            onThemeSelect={(themeId) => updateState({ selectedTheme: themeId })}
            title="Book Theme"
            previewPosition="right"
          />
        </div>
      </div>
    )
  );

  const renderAdvancedLayout = () => (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold mb-2">Layout Template</h3>
        <p className="text-sm text-gray-600">Choose a layout template for your book.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <LayoutSelector
          selectedLayout={wizardState.selectedTemplate}
          onLayoutSelect={(template) => updateState({ selectedTemplate: template })}
          previewPosition="right"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    wizardState.mode === 'quick' ? renderStep5() : (
      <div className="h-full flex flex-col min-h-0">
        <div className="mb-4 shrink-0">
          <h3 className="text-lg font-semibold mb-2">Color Palette</h3>
          <p className="text-sm text-gray-600">Choose the color scheme for your book.</p>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <WizardPaletteSelector
            selectedPalette={wizardState.selectedPalette}
            onPaletteSelect={(palette) => updateState({ selectedPalette: palette })}
            previewPosition="right"
            themeId={wizardState.selectedTheme}
          />
        </div>
      </div>
    )
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Confirmation</h3>
      <p className="text-sm text-gray-600">Review your selections and create your book.</p>
      
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <div>
          <span className="font-medium">Book Name:</span> {wizardState.name}
        </div>
        <div>
          <span className="font-medium">Format:</span> {wizardState.pageSize} {wizardState.orientation}
        </div>
        <div>
          <span className="font-medium">Layout:</span> {wizardState.selectedTemplate?.name || 'Simple Layout'}
        </div>
        <div>
          <span className="font-medium">Theme:</span> {getGlobalTheme(wizardState.selectedTheme)?.name || wizardState.selectedTheme}
        </div>
        <div>
          <span className="font-medium">Colors:</span> {wizardState.selectedPalette?.name}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (wizardState.mode === 'quick') {
      switch (currentStep) {
        case 1: return renderStep1();
        case 2: return renderStep2();
        case 3: return renderStep3();
        case 4: return renderStep5();
        default: return null;
      }
    }
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderAdvancedLayout();
      case 4: return renderStep3();
      case 5: return renderStep4();
      case 6: return renderStep5();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Book</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {renderProgressBar()}
          
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {renderCurrentStep()}
          </div>
          
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => onOpenChange(false) : prevStep}
            >
              {currentStep === 1 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>
            
            <Button
              onClick={currentStep === totalSteps ? handleFinish : nextStep}
              disabled={!canProceed()}
            >
              {currentStep === totalSteps ? (
                'Create Book'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}