import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, CheckCircle2, Palette, Layout, Sparkles, ChevronRight, Star, Info, AlertCircle, CopyPlus } from 'lucide-react';
import { Button } from '../../components/ui/primitives/button';
import { FormField } from '../../components/ui/layout/form-field';
import { Badge } from '../../components/ui/composites/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/overlays/dialog';
import { colorPalettes } from '../../data/templates/color-palettes';
import { pageTemplates as builtinPageTemplates } from '../../data/templates/page-templates';
import themesData from '../../data/templates/themes.json';
import { apiService } from '../../services/api';
import type { PageTemplate } from '../../types/template-types';
import { LayoutTemplatePreview } from '../../components/features/editor/templates/layout-selector';
import { mirrorTemplate } from '../../utils/layout-mirroring';

type Friend = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

type InviteDraft = {
  id: string;
  name: string;
  email: string;
};

type QuestionChoice = {
  id: string;
  text: string;
};

type CustomQuestion = {
  id: string;
  text: string;
};

type WizardState = {
  basic: {
    name: string;
    pageSize: 'A4' | 'A5';
    orientation: 'portrait' | 'landscape';
    presetId: string | null;
    startMode: 'preset' | 'assistant' | 'custom';
  };
  design: {
    layoutTemplate?: PageTemplate | null;
    leftLayoutTemplate?: PageTemplate | null;
    rightLayoutTemplate?: PageTemplate | null;
    mirrorLayout: boolean;
    pickLeftRight: boolean;
    randomizeLayout: boolean;
    themeId: string;
    paletteId: string;
  };
  team: {
    selectedFriends: Friend[];
    invites: InviteDraft[];
    enableGroupChat: boolean;
  };
  questions: {
    selectedDefaults: string[];
    custom: CustomQuestion[];
  };
};

const curatedQuestions: QuestionChoice[] = [
  { id: 'nickname', text: 'What is your nickname?' },
  { id: 'favoriteColor', text: 'What is your favorite color?' },
  { id: 'dreamJob', text: 'What is your dream job?' },
  { id: 'bestMemory', text: 'Share your favorite memory with me.' },
  { id: 'hiddenTalent', text: 'Do you have a hidden talent?' },
];


const stepConfig = [
  { id: 'basic', label: 'Basic Info & Start', description: 'Name, size, and quick presets' },
  { id: 'design', label: 'Design', description: 'Layouts, toggles, themes & palettes' },
  { id: 'team', label: 'Team & Content', description: 'Collaborators and question pool', optional: true },
  { id: 'review', label: 'Review', description: 'Double-check and create' },
] as const;

const featuredTemplates = builtinPageTemplates.slice(0, 6);

const initialState: WizardState = {
  basic: {
    name: '',
    pageSize: 'A4',
    orientation: 'portrait',
    presetId: null,
    startMode: 'custom',
  },
  design: {
    layoutTemplate: featuredTemplates[0],
    leftLayoutTemplate: null,
    rightLayoutTemplate: null,
    mirrorLayout: false,
    pickLeftRight: false,
    randomizeLayout: false,
    themeId: 'default',
    paletteId: 'default',
  },
  team: {
    selectedFriends: [],
    invites: [],
    enableGroupChat: false,
  },
  questions: {
    selectedDefaults: [],
    custom: [],
  },
};

export default function BookCreatePage() {
  const [wizardState, setWizardState] = useState<WizardState>(initialState);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [customQuestionDialogOpen, setCustomQuestionDialogOpen] = useState(false);
  const [customQuestionDraft, setCustomQuestionDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/friendships/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const friends = await response.json();
          setAvailableFriends(friends);
        }
      } catch (error) {
        console.warn('Failed to load friends:', error);
      }
    };
    fetchFriends();
  }, []);

  const currentStepId = stepConfig[activeStepIndex].id;

  const updateWizard = <K extends keyof WizardState>(key: K, value: Partial<WizardState[K]>) => {
    setWizardState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...value,
      },
    }));
  };

  const summaryData = useMemo(() => ({
    name: wizardState.basic.name,
    pageSize: wizardState.basic.pageSize,
    orientation: wizardState.basic.orientation,
    template: wizardState.design.layoutTemplate?.name ?? 'Not selected',
    theme: wizardState.design.themeId,
    palette: wizardState.design.paletteId,
    friends: wizardState.team.selectedFriends.length,
    questions: wizardState.questions.selectedDefaults.length + wizardState.questions.custom.length,
  }), [wizardState]);

  const handleBookWizard = () => {
    if (!wizardState.basic.name.trim()) return;
    setActiveStepIndex(1); // Jump to Design step
  };

  const handleBlankCanvas = async () => {
    if (!wizardState.basic.name.trim()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: 'default',
          themeId: 'default',
          colorPaletteId: 'default',
          layoutTemplateId: null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: 'same',
          initialPageCount: 24,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const newBook = await response.json();
      navigate(`/editor/${newBook.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionDraft.trim()) return;
    updateWizard('questions', {
      custom: [
        ...wizardState.questions.custom,
        { id: `custom-${Date.now()}`, text: customQuestionDraft.trim() },
      ],
    });
    setCustomQuestionDraft('');
    setCustomQuestionDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!wizardState.basic.name) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          name: wizardState.basic.name,
          pageSize: wizardState.basic.pageSize,
          orientation: wizardState.basic.orientation,
          bookTheme: wizardState.design.themeId,
          themeId: wizardState.design.themeId,
          colorPaletteId: wizardState.design.paletteId,
          layoutTemplateId: wizardState.design.pickLeftRight 
            ? (wizardState.design.leftLayoutTemplate?.id ?? wizardState.design.layoutTemplate?.id ?? null)
            : (wizardState.design.layoutTemplate?.id ?? null),
          leftLayoutTemplateId: wizardState.design.pickLeftRight ? wizardState.design.leftLayoutTemplate?.id ?? null : null,
          rightLayoutTemplateId: wizardState.design.pickLeftRight ? wizardState.design.rightLayoutTemplate?.id ?? null : null,
          pagePairingEnabled: true,
          specialPagesConfig: {
            cover: { locked: true, printable: false },
          },
          layoutStrategy: wizardState.design.pickLeftRight 
            ? 'paired' 
            : wizardState.design.mirrorLayout 
              ? 'mirrored' 
              : wizardState.design.randomizeLayout 
                ? 'random' 
                : 'same',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create book');
      }

      const newBook = await response.json();

      // Attach collaborators
      await Promise.all(
        wizardState.team.selectedFriends.map(async (friend) => {
          try {
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/books/${newBook.id}/friends`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                friendId: friend.id,
                book_role: 'author',
                page_access_level: 'own_page',
                editor_interaction_level: 'full_edit',
              }),
            });
          } catch (error) {
            console.warn('Failed to add friend', friend.id, error);
          }
        }),
      );

      // Create curated questions
      for (const questionId of wizardState.questions.selectedDefaults) {
        const question = curatedQuestions.find((q) => q.id === questionId);
        if (question) {
          await apiService.createQuestion(newBook.id, question.text);
        }
      }

      for (const custom of wizardState.questions.custom) {
        await apiService.createQuestion(newBook.id, custom.text);
      }

      navigate(`/editor/${newBook.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = (() => {
    switch (currentStepId) {
      case 'basic':
        return (
          <BasicStep
            wizardState={wizardState}
            onChange={(data) => updateWizard('basic', data)}
            onBookWizard={handleBookWizard}
            onBlankCanvas={handleBlankCanvas}
            isSubmitting={isSubmitting}
          />
        );
      case 'design':
        return (
          <DesignStep
            wizardState={wizardState}
            onChange={(data) => updateWizard('design', data)}
          />
        );
      case 'team':
        return (
          <TeamContentStep
            wizardState={wizardState}
            onTeamChange={(data) => updateWizard('team', data)}
            onQuestionChange={(data) => updateWizard('questions', data)}
            availableFriends={availableFriends}
            openCustomQuestionModal={() => setCustomQuestionDialogOpen(true)}
          />
        );
      case 'review':
      default:
        return (
          <ReviewStep
            wizardState={wizardState}
            onEdit={(targetId) => {
              const idx = stepConfig.findIndex((step) => step.id === targetId);
              if (idx >= 0) setActiveStepIndex(idx);
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
    }
  })();

  return (
    <div className="w-full min-h-screen bg-muted/20">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <StepNavigation
          steps={stepConfig}
          activeStepIndex={activeStepIndex}
          onStepClick={setActiveStepIndex}
          wizardState={wizardState}
        />
        
        <div className="flex flex-col gap-6 lg:flex-row mt-6">
          <div className="flex-1 space-y-6">
            {currentStep}
          </div>

          <BookSummaryCard summary={summaryData} />
        </div>
      </div>

      <Dialog open={customQuestionDialogOpen} onOpenChange={setCustomQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Question text">
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={customQuestionDraft}
                onChange={(e) => setCustomQuestionDraft(e.target.value)}
                placeholder="What would you like to ask?"
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCustomQuestionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomQuestion}>
                Add question
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepNavigation({
  steps,
  activeStepIndex,
  onStepClick,
  wizardState,
}: {
  steps: typeof stepConfig;
  activeStepIndex: number;
  onStepClick: (index: number) => void;
  wizardState: WizardState;
}) {
  const canAccessStep = (index: number) => {
    if (index === 0) return true; // Basic step always accessible
    if (index === 1) return wizardState.basic.name.trim().length > 0; // Design step needs book name
    if (index === 2) return wizardState.basic.name.trim().length > 0 && wizardState.design.layoutTemplate !== null; // Team step needs basic + design
    if (index === 3) return wizardState.basic.name.trim().length > 0 && wizardState.design.layoutTemplate !== null; // Review step needs basic + design
    return false;
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl bg-white shadow-sm border p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold text-primary">Book wizard</p>
          <p className="text-xs text-muted-foreground">
            Follow the steps to set up your collaborative book.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = index < activeStepIndex;
            const isAccessible = canAccessStep(index);
            return (
              <button
                key={step.id}
                onClick={() => isAccessible && onStepClick(index)}
                disabled={!isAccessible}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                  isActive ? 'bg-primary text-primary-foreground' : 
                  isCompleted ? 'bg-primary/10 text-primary' : 
                  isAccessible ? 'bg-muted/40 hover:bg-muted/60' : 
                  'bg-muted/20 text-muted-foreground cursor-not-allowed opacity-50'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <div className={`h-4 w-4 rounded-full border-2 ${isActive ? 'border-primary-foreground' : 'border-current'}`} />
                )}
                <span className="text-sm font-semibold">{step.label}</span>
                {'optional' in step && step.optional && (
                  <Badge variant="outline" className="text-[10px] bg-transparent">
                    Optional
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BasicStep({
  wizardState,
  onChange,
  onBookWizard,
  onBlankCanvas,
  isSubmitting,
}: {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['basic']>) => void;
  onBookWizard: () => void;
  onBlankCanvas: () => void;
  isSubmitting: boolean;
}) {
  const hasBookName = wizardState.basic.name.trim().length > 0;

  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Basic setup</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Name your book, select size & orientation, then choose how to start.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Book name">
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={wizardState.basic.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="E.g. Class of 2025"
          />
        </FormField>
        <FormField label="Orientation">
          <div className="flex gap-2">
            {['portrait', 'landscape'].map((option) => (
              <Button
                key={option}
                variant={wizardState.basic.orientation === option ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onChange({ orientation: option as WizardState['basic']['orientation'] })}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </div>
        </FormField>
        <FormField label="Page size">
          <div className="flex gap-2">
            {['A4', 'A5'].map((size) => (
              <Button
                key={size}
                variant={wizardState.basic.pageSize === size ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onChange({ pageSize: size as WizardState['basic']['pageSize'] })}
              >
                {size}
              </Button>
            ))}
          </div>
        </FormField>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          Quick start
          <Badge variant="outline" className="text-[10px]">Recommended</Badge>
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={onBookWizard}
            disabled={!hasBookName || isSubmitting}
            className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
              !hasBookName || isSubmitting ? 'border-border bg-muted/20 opacity-50 cursor-not-allowed' : 'border-border bg-card hover:border-primary'
            }`}
          >
            <p className="font-semibold">Book Wizard</p>
            <p className="text-xs text-muted-foreground">Continue through the wizard to customize your book</p>
          </button>
          <button
            onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
              !hasBookName || isSubmitting ? 'border-border bg-muted/20 opacity-50 cursor-not-allowed' : 'border-border bg-card hover:border-primary'
            }`}
          >
            <p className="font-semibold">Blank Canvas</p>
            <p className="text-xs text-muted-foreground">Create a book with 24 blank pages and start editing</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function DesignStep({
  wizardState,
  onChange,
}: {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['design']>) => void;
}) {
  const [selectingSide, setSelectingSide] = useState<'left' | 'right' | null>(null);

  const themeEntries = useMemo(() => {
    return Object.entries(themesData as Record<string, { name: string; description: string; palette?: string }>).slice(0, 6).map(([id, theme]) => ({
      id,
      name: theme.name ?? id,
      description: theme.description ?? 'Custom theme',
      paletteId: theme.palette ?? 'default',
    }));
  }, []);

  const selectedPalette = colorPalettes.find((p) => p.id === wizardState.design.paletteId) ?? colorPalettes[0];
  const selectedTemplate = wizardState.design.layoutTemplate;
  const leftTemplate = wizardState.design.leftLayoutTemplate || wizardState.design.layoutTemplate;
  const rightTemplate = wizardState.design.pickLeftRight 
    ? wizardState.design.rightLayoutTemplate || wizardState.design.layoutTemplate
    : wizardState.design.mirrorLayout && wizardState.design.layoutTemplate
      ? mirrorTemplate(wizardState.design.layoutTemplate)
      : wizardState.design.layoutTemplate;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Overall Preview - Left Side */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="rounded-2xl bg-white shadow-sm border p-4 sticky lg:top-24">
          <p className="text-sm font-semibold mb-3">Layout Preview</p>
          {leftTemplate || rightTemplate ? (
            <div className="space-y-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">Left Page</div>
                  {leftTemplate ? (
                    <LayoutTemplatePreview 
                      template={leftTemplate} 
                      showLegend={false}
                      showItemLabels={false}
                      className="w-full"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50 aspect-[210/297] flex items-center justify-center text-[10px] text-muted-foreground">
                      Select left
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-muted-foreground mb-1">Right Page</div>
                  {rightTemplate ? (
                    <LayoutTemplatePreview 
                      template={rightTemplate} 
                      showLegend={false}
                      showItemLabels={false}
                      className="w-full"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-slate-50 aspect-[210/297] flex items-center justify-center text-[10px] text-muted-foreground">
                      Select right
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {wizardState.design.pickLeftRight ? (
                  <>
                    <p className="font-medium">Left: {leftTemplate?.name || 'Not selected'}</p>
                    <p className="font-medium mt-1">Right: {rightTemplate?.name || 'Not selected'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{selectedTemplate?.name || 'Not selected'}</p>
                    {wizardState.design.mirrorLayout && <p className="text-[10px] mt-1">Right page mirrored</p>}
                  </>
                )}
                <p className="mt-1">Palette: {selectedPalette.name}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Select a layout to see preview
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 rounded-2xl bg-white shadow-sm border p-6 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Design workspace</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose layout templates, toggle mirrored/randomized spreads, then pick a theme with palette recommendations.
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            Layout templates
            <Badge variant="outline" className="text-[10px]">Inline controls</Badge>
          </div>
          {wizardState.design.pickLeftRight && (
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold mb-2">Selecting for: {selectingSide === 'left' ? 'Left Page' : selectingSide === 'right' ? 'Right Page' : 'Choose a side'}</p>
              <div className="flex gap-2">
                <Button
                  variant={selectingSide === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectingSide('left')}
                >
                  Select Left
                </Button>
                <Button
                  variant={selectingSide === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectingSide('right')}
                >
                  Select Right
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {featuredTemplates.map((template) => {
              const isSelectedLeft = wizardState.design.leftLayoutTemplate?.id === template.id;
              const isSelectedRight = wizardState.design.rightLayoutTemplate?.id === template.id;
              const isSelected = !wizardState.design.pickLeftRight && wizardState.design.layoutTemplate?.id === template.id;
              const isSelecting = selectingSide !== null && (isSelectedLeft || isSelectedRight);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (wizardState.design.pickLeftRight) {
                      if (selectingSide === 'left') {
                        onChange({ leftLayoutTemplate: template, layoutTemplate: template });
                        setSelectingSide(null);
                      } else if (selectingSide === 'right') {
                        onChange({ rightLayoutTemplate: template });
                        setSelectingSide(null);
                      } else {
                        // No side selected, ask user to choose
                        return;
                      }
                    } else {
                      onChange({ layoutTemplate: template, leftLayoutTemplate: null, rightLayoutTemplate: null });
                    }
                  }}
                  className={`rounded-xl border p-2 transition hover:shadow-sm aspect-[3/4] flex items-center justify-center relative ${
                    isSelected || isSelecting ? 'border-primary bg-primary/5 ring-2 ring-primary' : 
                    isSelectedLeft ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' :
                    isSelectedRight ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300' :
                    'border-border bg-card'
                  }`}
                  title={template.name}
                >
                  <div className="w-full max-w-[60px]">
                    <LayoutTemplatePreview 
                      template={template} 
                      showLegend={false}
                      showItemLabels={false}
                    />
                  </div>
                  {isSelectedLeft && (
                    <span className="absolute top-1 left-1 bg-blue-500 text-white text-[8px] px-1 rounded">L</span>
                  )}
                  {isSelectedRight && (
                    <span className="absolute top-1 right-1 bg-purple-500 text-white text-[8px] px-1 rounded">R</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <TogglePill
              active={wizardState.design.mirrorLayout && !wizardState.design.pickLeftRight}
              label="Mirror right page"
              onClick={() => {
                onChange({ 
                  mirrorLayout: !wizardState.design.mirrorLayout,
                  pickLeftRight: false,
                  leftLayoutTemplate: null,
                  rightLayoutTemplate: null,
                });
              }}
            />
            <TogglePill
              active={wizardState.design.pickLeftRight}
              label="Pick Left & Right"
              onClick={() => {
                const newPickLeftRight = !wizardState.design.pickLeftRight;
                onChange({ 
                  pickLeftRight: newPickLeftRight,
                  mirrorLayout: false,
                  leftLayoutTemplate: newPickLeftRight ? wizardState.design.layoutTemplate || null : null,
                  rightLayoutTemplate: newPickLeftRight ? null : null,
                });
                if (newPickLeftRight) {
                  setSelectingSide('left');
                } else {
                  setSelectingSide(null);
                }
              }}
            />
            <TogglePill
              active={wizardState.design.randomizeLayout}
              label="Randomize spreads"
              onClick={() => onChange({ randomizeLayout: !wizardState.design.randomizeLayout })}
            />
          </div>
        </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Themes & palette recommendations
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {themeEntries.map((theme) => (
            <button
              key={theme.id}
              onClick={() => onChange({ themeId: theme.id })}
              className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
                wizardState.design.themeId === theme.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <p className="font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                {theme.name}
              </p>
              <p className="text-xs text-muted-foreground">{theme.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  theme.paletteId,
                  ...colorPalettes
                    .filter((palette) => palette.id !== theme.paletteId)
                    .slice(0, 2)
                    .map((palette) => palette.id),
                ].map((paletteId) => {
                  const palette = colorPalettes.find((p) => p.id === paletteId) ?? colorPalettes[0];
                  return (
                    <button
                      key={`${theme.id}-${palette.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ paletteId: palette.id, themeId: theme.id });
                      }}
                      className={`px-2 py-1 rounded-full border text-xs ${
                        wizardState.design.paletteId === palette.id ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {palette.name}
                    </button>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted/40'
      }`}
    >
      {label}
    </button>
  );
}

function TeamContentStep({
  wizardState,
  onTeamChange,
  onQuestionChange,
  availableFriends,
  openCustomQuestionModal,
}: {
  wizardState: WizardState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  onQuestionChange: (data: Partial<WizardState['questions']>) => void;
  availableFriends: Friend[];
  openCustomQuestionModal: () => void;
}) {
  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  const toggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      onQuestionChange({
        selectedDefaults: selectedQuestionIds.filter((q) => q !== id),
      });
    } else {
      onQuestionChange({
        selectedDefaults: [...selectedQuestionIds, id],
      });
    }
  };

  const addFriend = (friend: Friend) => {
    if (wizardState.team.selectedFriends.some((f) => f.id === friend.id)) return;
    onTeamChange({
      selectedFriends: [...wizardState.team.selectedFriends, friend],
    });
  };

  const removeFriend = (friendId: number) => {
    onTeamChange({
      selectedFriends: wizardState.team.selectedFriends.filter((friend) => friend.id !== friendId),
    });
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Team & Content (optional)</h2>
          <p className="text-sm text-muted-foreground">Invite collaborators and prep the questions they’ll answer.</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Collaborators
          <Badge variant="outline" className="text-[10px]">Optional</Badge>
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Select friends to invite (they’ll receive access after the book is created).</p>
          <div className="flex flex-wrap gap-2">
            {availableFriends.map((friend) => (
              <Button
                key={friend.id}
                variant={wizardState.team.selectedFriends.some((f) => f.id === friend.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => addFriend(friend)}
              >
                {friend.name}
              </Button>
            ))}
          </div>
          {wizardState.team.selectedFriends.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Selected</p>
              <div className="flex flex-wrap gap-2">
                {wizardState.team.selectedFriends.map((friend) => (
                  <Badge key={friend.id} variant="secondary" className="flex items-center gap-2">
                    {friend.name}
                    <button onClick={() => removeFriend(friend.id)} className="text-xs text-muted-foreground hover:text-foreground">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="group-chat"
              checked={wizardState.team.enableGroupChat}
              onChange={(e) => onTeamChange({ enableGroupChat: e.target.checked })}
            />
            <label htmlFor="group-chat" className="text-sm text-muted-foreground">
              Enable messenger group chat for collaborators
            </label>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          Question set
          <Badge variant="outline" className="text-[10px]">Optional</Badge>
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Select from our curated prompts or add your own.</p>
          <div className="space-y-2">
            {curatedQuestions.map((question) => (
              <label key={question.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedQuestionIds.includes(question.id)}
                  onChange={() => toggleQuestion(question.id)}
                />
                <span>{question.text}</span>
              </label>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={openCustomQuestionModal} className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Add custom question
          </Button>
          {wizardState.questions.custom.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Custom questions</p>
              <ul className="text-sm text-muted-foreground list-disc pl-4">
                {wizardState.questions.custom.map((question) => (
                  <li key={question.id}>{question.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReviewStep({
  wizardState,
  onEdit,
  onSubmit,
  isSubmitting,
}: {
  wizardState: WizardState;
  onEdit: (id: typeof stepConfig[number]['id']) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Review & finalize</h2>
          <p className="text-sm text-muted-foreground">Make sure everything looks good before creating the book.</p>
        </div>
      </div>

      <ReviewSection
        title="Basics"
        description={`${wizardState.basic.name} • ${wizardState.basic.pageSize} • ${wizardState.basic.orientation}`}
        onEdit={() => onEdit('basic')}
      />
      <ReviewSection
        title="Design"
        description={`${wizardState.design.layoutTemplate?.name ?? 'Not selected'}, Theme ${wizardState.design.themeId}, Palette ${wizardState.design.paletteId}`}
        onEdit={() => onEdit('design')}
      />
      <ReviewSection
        title="Team & Content"
        description={`${wizardState.team.selectedFriends.length} collaborators • ${wizardState.questions.selectedDefaults.length + wizardState.questions.custom.length} questions`}
        onEdit={() => onEdit('team')}
        optional
      />

      <div className="rounded-xl border border-dashed p-4 flex items-center gap-3 bg-muted/40 text-sm text-muted-foreground">
        <Info className="h-4 w-4 text-primary" />
        You can still invite more friends or tweak questions later inside the editor.
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating book...' : 'Create book and open editor'}
      </Button>
    </div>
  );
}

function ReviewSection({
  title,
  description,
  onEdit,
  optional,
}: {
  title: string;
  description: string;
  onEdit: () => void;
  optional?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold flex items-center gap-2">
          {title}
          {optional && (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

function BookSummaryCard({
  summary,
}: {
  summary: {
    name: string;
    pageSize: string;
    orientation: string;
    template: string;
    theme: string;
    palette: string;
    friends: number;
    questions: number;
  };
}) {
  return (
    <div className="w-full lg:w-64">
      <div className="rounded-2xl bg-white shadow-sm border p-5 space-y-4 lg:sticky">
        <div className="flex items-center gap-2">
          <CopyPlus className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Book summary</p>
            <p className="text-xs text-muted-foreground">Auto-updated as you go</p>
          </div>
        </div>
        <SummaryRow label="Name" value={summary.name} />
        <SummaryRow label="Format" value={`${summary.pageSize} • ${summary.orientation}`} />
        <SummaryRow label="Layout" value={summary.template} />
        <SummaryRow label="Theme" value={`${summary.theme} • ${summary.palette}`} />
        <SummaryRow label="Collaborators" value={`${summary.friends}`} />
        <SummaryRow label="Questions" value={`${summary.questions}`} />
        <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          You can revisit these settings later.
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold">{value || '—'}</p>
    </div>
  );
}

