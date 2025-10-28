# Book Creation Wizard Integration Guide

This document explains how to integrate the template system into a book creation wizard.

## Overview

The template system has been designed to be wizard-compatible with minimal additional work. The main components are:

1. **TemplateSelectorStep** - Simplified template gallery for wizard use
2. **Wizard State Management** - Template selection storage in editor context
3. **Book Creation Utils** - Complete book setup from wizard data

## Components

### TemplateSelectorStep

**Location**: `client/src/components/templates/template-selector-step.tsx`

A simplified version of the template gallery designed for wizard use:

- **Compact Layout**: 3 columns instead of 4 for better wizard flow
- **Combined Selection**: Template + palette selection in one view
- **Skip Option**: "Skip this step" button uses default template
- **Navigation**: Standard wizard navigation (Back/Next buttons)
- **State Storage**: Stores selection without applying (for wizard completion)

**Usage**:
```tsx
import TemplateSelectorStep, { type TemplateSelection } from './components/templates/template-selector-step';

function WizardStep4() {
  const [selection, setSelection] = useState<TemplateSelection>({
    templateId: null,
    paletteId: null
  });

  return (
    <TemplateSelectorStep
      selection={selection}
      onSelectionChange={setSelection}
      onNext={() => goToNextStep()}
      onBack={() => goToPreviousStep()}
      onSkip={() => handleSkipTemplates()}
    />
  );
}
```

### Wizard State Management

**Location**: `client/src/context/editor-context.tsx`

Added to editor context for template selection storage:

```typescript
interface WizardTemplateSelection {
  selectedTemplateId: string | null;
  selectedPaletteId: string | null;
  templateCustomizations?: any;
}

// Available functions:
getWizardTemplateSelection(): WizardTemplateSelection
setWizardTemplateSelection(selection: WizardTemplateSelection): void
```

### Book Creation Utils

**Location**: `client/src/utils/book-creation-utils.ts`

Complete book creation from wizard data:

```typescript
// Main function for creating book from wizard
createBookFromWizard(wizardData: WizardData): Promise<Book>

// Apply template to all pages (for consistent design)
applyTemplateToAllPages(bookId: string, template: PageTemplate, palette: ColorPalette): Promise<void>

// Validate wizard data before creation
validateWizardData(wizardData: WizardData): { valid: boolean; errors: string[] }
```

## Wizard Data Structure

```typescript
interface WizardData {
  // Step 1: Basic Information
  bookName: string;
  pageSize: string;
  orientation: string;
  
  // Step 2: Collaborators (optional)
  collaborators?: Array<{
    id: number;
    name: string;
    email: string;
    role: 'author' | 'publisher';
    pageAccessLevel: 'own_page' | 'all_pages';
    editorInteractionLevel: 'answer_only' | 'full_edit' | 'full_edit_with_settings';
  }>;
  
  // Step 3: Questions (optional)
  selectedQuestions?: Array<{
    id: string;
    text: string;
    poolId?: number;
  }>;
  
  // Step 4: Template & Theme
  templateSelection?: {
    templateId: string;
    paletteId: string;
    customizations?: any;
  };
  
  // Step 5: Special Pages (optional)
  specialPages?: {
    coverPage?: boolean;
    indexPage?: boolean;
    thanksPage?: boolean;
  };
  
  // Additional configuration
  pageCount?: number;
}
```

## Integration Steps

### 1. Create Wizard Component Structure

```tsx
// components/wizard/book-creation-wizard.tsx
function BookCreationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    bookName: '',
    pageSize: 'A4',
    orientation: 'portrait'
  });

  const steps = [
    { component: BasicInfoStep, title: 'Basic Information' },
    { component: CollaboratorsStep, title: 'Add Collaborators' },
    { component: QuestionsStep, title: 'Select Questions' },
    { component: TemplateSelectorStep, title: 'Choose Template' },
    { component: SpecialPagesStep, title: 'Special Pages' },
    { component: ReviewStep, title: 'Review & Create' }
  ];

  return (
    <div className="wizard-container">
      {/* Render current step */}
    </div>
  );
}
```

### 2. Implement Template Step

```tsx
// In your wizard component
function handleTemplateStep() {
  const { getWizardTemplateSelection, setWizardTemplateSelection } = useEditor();
  
  return (
    <TemplateSelectorStep
      selection={getWizardTemplateSelection()}
      onSelectionChange={setWizardTemplateSelection}
      onNext={() => {
        // Store selection in wizard data
        const selection = getWizardTemplateSelection();
        setWizardData(prev => ({
          ...prev,
          templateSelection: {
            templateId: selection.selectedTemplateId!,
            paletteId: selection.selectedPaletteId!,
            customizations: selection.templateCustomizations
          }
        }));
        setCurrentStep(5);
      }}
      onBack={() => setCurrentStep(3)}
      onSkip={() => {
        // Use default template
        setWizardData(prev => ({
          ...prev,
          templateSelection: {
            templateId: 'default',
            paletteId: 'default'
          }
        }));
        setCurrentStep(5);
      }}
    />
  );
}
```

### 3. Complete Book Creation

```tsx
// Final step - create the book
async function handleCreateBook() {
  try {
    // Validate wizard data
    const validation = validateWizardData(wizardData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Create book from wizard data
    const book = await createBookFromWizard(wizardData);
    
    // Redirect to editor
    navigate(`/editor/${book.id}`);
    
  } catch (error) {
    console.error('Failed to create book:', error);
    setError('Failed to create book. Please try again.');
  }
}
```

## Example Wizard Flow

1. **Basic Information** - Book name, page size, orientation
2. **Collaborators** - Add friends and set permissions (optional)
3. **Questions** - Select from question pool (optional)
4. **Template & Theme** - Use TemplateSelectorStep component
5. **Special Pages** - Cover page, index, thanks page (optional)
6. **Review & Create** - Show summary and create book

## API Integration

The book creation process handles:

1. **Book Creation** - `POST /api/books`
2. **Collaborator Addition** - `POST /api/books/{id}/friends`
3. **Question Assignment** - `POST /api/questions`
4. **Template Application** - `PUT /api/books/{id}` (with template data)
5. **Special Pages** - Additional API calls as needed

## Error Handling

```typescript
// Validation before creation
const validation = validateWizardData(wizardData);
if (!validation.valid) {
  // Show validation errors
  return;
}

// Handle creation errors
try {
  const book = await createBookFromWizard(wizardData);
} catch (error) {
  // Show user-friendly error message
  // Allow retry or go back to fix issues
}
```

## Future Enhancements

1. **Template Customization** - Allow color/font modifications in wizard
2. **Preview Mode** - Show book preview before creation
3. **Save Draft** - Allow saving wizard progress
4. **Template Categories** - Filter templates by use case
5. **Bulk Operations** - Apply templates to multiple books

## Notes

- Template selection is stored in editor context for consistency
- Book creation is atomic - either succeeds completely or fails
- All wizard data is validated before book creation
- Template application happens after basic book creation
- Special pages can be added through additional API calls