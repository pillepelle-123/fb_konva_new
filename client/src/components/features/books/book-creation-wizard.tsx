import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { ChevronLeft, ChevronRight, Check, Layout, Palette, Paintbrush2 } from 'lucide-react';
import { pageTemplates } from '../../../data/templates/page-templates';
import { colorPalettes } from '../../../data/templates/color-palettes';
import { getGlobalTheme } from '../../../utils/global-themes';
import type { PageTemplate, ColorPalette } from '../../../types/template-types';

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
  selectedTemplate: PageTemplate | null;
  selectedTheme: string;
  selectedPalette: ColorPalette | null;
}

const themes = ['default', 'sketchy', 'minimal'];

export default function BookCreationWizard({ open, onOpenChange, onSuccess }: BookCreationWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState<WizardState>({
    name: '',
    pageSize: 'A4',
    orientation: 'portrait',
    selectedTemplate: null,
    selectedTheme: 'default',
    selectedPalette: colorPalettes[0]
  });

  const totalSteps = 5;

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
    switch (currentStep) {
      case 1: return wizardState.name.trim().length > 0;
      case 2: return true; // Template is optional
      case 3: return true; // Theme has default
      case 4: return true; // Palette has default
      case 5: return true; // Confirmation
      default: return false;
    }
  };

  const handleFinish = async () => {
    const tempId = `temp_${Date.now()}`;
    
    const newBook = {
      id: tempId,
      name: wizardState.name,
      pageSize: wizardState.pageSize,
      orientation: wizardState.orientation,
      owner_id: user?.id,
      bookTheme: wizardState.selectedTheme,
      pages: [{
        id: Date.now(),
        pageNumber: 1,
        elements: [],
        background: {
          type: 'color' as const,
          value: wizardState.selectedPalette?.colors.background || '#ffffff',
          opacity: 1,
          pageTheme: wizardState.selectedTheme
        },
        database_id: undefined
      }],
      isTemporary: true,
      wizardSelections: {
        template: wizardState.selectedTemplate,
        theme: wizardState.selectedTheme,
        palette: wizardState.selectedPalette
      }
    };
    
    tempBooks.set(tempId, newBook);
    (window as any).tempBooks = tempBooks;
    
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
      <div className="flex items-center gap-2">
        <Layout className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Layout Template</h3>
      </div>
      <p className="text-sm text-gray-600">Choose a layout template or skip to use a simple single textbox.</p>
      
      <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        <button
          onClick={() => updateState({ selectedTemplate: null })}
          className={`p-3 border rounded-lg text-left transition-colors ${
            !wizardState.selectedTemplate ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-sm">Simple Layout</div>
          <div className="text-xs text-gray-600 mt-1">Single textbox</div>
          <div className="mt-2 h-16 bg-gray-100 rounded border relative">
            <div className="absolute inset-2 bg-blue-200 rounded-sm opacity-60" />
          </div>
        </button>
        
        {pageTemplates.slice(0, 7).map((template) => (
          <button
            key={template.id}
            onClick={() => updateState({ selectedTemplate: template })}
            className={`p-3 border rounded-lg text-left transition-colors ${
              wizardState.selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{template.name}</div>
            <div className="text-xs text-gray-600 mt-1 capitalize">{template.category}</div>
            <div className="mt-2 h-16 bg-gray-100 rounded border relative overflow-hidden">
              <div className="absolute inset-1 grid grid-cols-2 gap-1">
                {template.textboxes.slice(0, 4).map((_, i) => (
                  <div key={i} className="bg-blue-200 rounded-sm opacity-60" />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paintbrush2 className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Theme Selection</h3>
      </div>
      <p className="text-sm text-gray-600">Choose the visual style for your book.</p>
      
      <div className="grid grid-cols-1 gap-3">
        {themes.map((themeId) => {
          const theme = getGlobalTheme(themeId);
          return (
            <button
              key={themeId}
              onClick={() => updateState({ selectedTheme: themeId })}
              className={`p-4 border rounded-lg text-left transition-colors ${
                wizardState.selectedTheme === themeId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{theme?.name || themeId}</div>
                  <div className="text-sm text-gray-600 mt-1">{theme?.description || 'Theme styling'}</div>
                </div>
                <div className="flex gap-1">
                  <div className={`w-6 h-6 rounded-sm ${
                    themeId === 'sketchy' ? 'bg-orange-200 border-2 border-orange-400' :
                    themeId === 'minimal' ? 'bg-gray-100 border border-gray-300' :
                    'bg-white border border-gray-400'
                  }`} />
                  <div className={`w-6 h-6 rounded-sm ${
                    themeId === 'sketchy' ? 'bg-yellow-200 border-2 border-yellow-400' :
                    themeId === 'minimal' ? 'bg-gray-50 border border-gray-200' :
                    'bg-gray-50 border border-gray-300'
                  }`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Color Palette</h3>
      </div>
      <p className="text-sm text-gray-600">Choose the color scheme for your book.</p>
      
      <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
        {colorPalettes.slice(0, 12).map((palette) => (
          <button
            key={palette.id}
            onClick={() => updateState({ selectedPalette: palette })}
            className={`p-3 border rounded-lg text-left transition-colors ${
              wizardState.selectedPalette?.id === palette.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{palette.name}</div>
            <div className="mt-2 flex gap-1">
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.primary }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.secondary }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.accent }}
              />
              <div 
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{ backgroundColor: palette.colors.background }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{palette.contrast} contrast</div>
          </button>
        ))}
      </div>
    </div>
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
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Book</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {renderProgressBar()}
          
          <div className="flex-1 overflow-y-auto">
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