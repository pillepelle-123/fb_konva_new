import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { colorPalettes } from '../../../data/templates/color-palettes';
import { getGlobalTheme } from '../../../utils/global-themes';
import type { PageTemplate, ColorPalette, QuickTemplate } from '../../../types/template-types';
import { convertTemplateToElements } from '../../../utils/template-to-elements';
import { getBackgroundImagesWithUrl } from '../../../data/templates/background-images';
import { LayoutSelector } from '../editor/templates/layout-selector';
import { GlobalThemeSelector } from '../editor/templates/global-theme-selector';
import { WizardPaletteSelector } from '../editor/templates/wizard-palette-selector';

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
      paletteToUse = quickTemplate?.paletteId 
        ? colorPalettes.find(p => p.id === quickTemplate.paletteId) || finalPalette
        : finalPalette;
      themeToUse = template?.theme || finalTheme;
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
      themeToUse,
      templateTheme: template?.theme
    });
    
    // Erstelle Elemente aus Template (falls Template gewählt)
    const elements = template ? convertTemplateToElements(template) : [];
    
    // Bereite Background vor
    let background: {
      type: 'color' | 'pattern' | 'image';
      value: string;
      opacity: number;
      pageTheme?: string;
      backgroundImageTemplateId?: string;
      imageSize?: string;
    } = {
      type: 'color' as const,
      value: paletteToUse.colors.background,
      opacity: 1,
      pageTheme: themeToUse
    };
    
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
    } else if (template?.background?.enabled) {
      // Nutze Template Background wenn definiert
      background = {
        type: template.background.type,
        value: template.background.value,
        opacity: 1,
        pageTheme: themeToUse
      };
    }
    
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
        colorPaletteId: paletteToUse.id,
        layoutTemplateId: template?.id || null,
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
      <div className="space-y-4 h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Quick Templates</h3>
          <p className="text-sm text-gray-600">Wähle eine komplette Vorlage. Theme und Palette werden automatisch übernommen (später änderbar).</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <LayoutSelector
            selectedLayout={wizardState.selectedTemplate}
            onLayoutSelect={(template) => {
              const adoptedTheme = template.theme || 'default';
              updateState({ selectedTemplate: template, selectedTheme: adoptedTheme });
            }}
            previewPosition="right"
          />
        </div>
      </div>
    ) : (
      <div className="space-y-4 h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Theme Selection</h3>
          <p className="text-sm text-gray-600">Choose the visual style for your book.</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <GlobalThemeSelector
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
    <div className="space-y-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Layout Template</h3>
        <p className="text-sm text-gray-600">Choose a layout template for your book.</p>
      </div>
      <div className="flex-1 overflow-hidden">
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
      <div className="space-y-4 h-full flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Color Palette</h3>
          <p className="text-sm text-gray-600">Choose the color scheme for your book.</p>
        </div>
        <div className="flex-1 overflow-hidden">
          <WizardPaletteSelector
            selectedPalette={wizardState.selectedPalette}
            onPaletteSelect={(palette) => updateState({ selectedPalette: palette })}
            previewPosition="right"
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
          
          <div className="flex-1 overflow-hidden min-h-0">
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