# Template System Documentation

## Overview

The template system provides pre-designed page layouts that users can apply to create consistent, professional-looking pages quickly. It includes template galleries, customization options, color palettes, and wizard integration.

## Architecture

### Core Components

```
client/src/
├── components/templates/
│   ├── template-gallery.tsx          # Main template selection interface
│   ├── template-card.tsx             # Individual template display
│   ├── template-preview.tsx          # Template preview rendering
│   ├── template-customizer.tsx       # Template customization interface
│   ├── template-selector-step.tsx    # Wizard-compatible selector
│   └── template-help.tsx             # User documentation
├── data/templates/
│   ├── page-templates.ts             # Template definitions
│   └── color-palettes.ts             # Color palette definitions
├── utils/
│   ├── template-utils.ts             # Template utility functions
│   ├── template-to-elements.ts       # Template conversion logic
│   ├── thumbnail-generator.ts        # Visual thumbnail generation
│   ├── template-validation.ts        # Data validation
│   └── book-creation-utils.ts        # Wizard integration
└── types/
    └── template-types.ts             # TypeScript definitions
```

## Template Data Structure

### PageTemplate Interface

```typescript
interface PageTemplate {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  category: TemplateCategory;    // Category for filtering
  theme: string;                 // Visual theme
  elements: TemplateElement[];   // Page elements
  background: {                  // Background settings
    type: 'color' | 'pattern' | 'image';
    value: string;
  };
  colorPalette: ColorPalette;    // Associated colors
}
```

### TemplateElement Interface

```typescript
interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;                     // Position (pixels)
  y: number;
  width: number;                 // Dimensions (pixels)
  height: number;
  textType?: 'question' | 'answer' | 'text';
  shape?: 'circle' | 'rectangle' | 'triangle';
  style?: {                      // Optional styling
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
  };
}
```

### ColorPalette Interface

```typescript
interface ColorPalette {
  id: string;
  name: string;
  colors: {
    primary: string;             // Main accent color
    secondary: string;           // Secondary accent
    background: string;          // Page background
    text: string;               // Primary text color
    accent?: string;            // Additional accent
    [key: string]: string;      // Custom colors
  };
}
```

## Adding New Templates

### 1. Create Template Definition

```typescript
// In client/src/data/templates/page-templates.ts
const newTemplate: PageTemplate = {
  id: 'my-custom-template',
  name: 'My Custom Template',
  category: 'structured',
  theme: 'default',
  elements: [
    {
      id: 'title-text',
      type: 'text',
      x: 50,
      y: 50,
      width: 300,
      height: 60,
      textType: 'text',
      style: {
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        color: '#333333'
      }
    },
    {
      id: 'question-1',
      type: 'text',
      x: 50,
      y: 150,
      width: 250,
      height: 40,
      textType: 'question'
    },
    {
      id: 'image-placeholder',
      type: 'image',
      x: 350,
      y: 100,
      width: 200,
      height: 150
    }
  ],
  background: {
    type: 'color',
    value: '#ffffff'
  },
  colorPalette: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#ffffff',
    text: '#1f2937'
  }
};

// Add to pageTemplates array
export const pageTemplates: PageTemplate[] = [
  // ... existing templates
  newTemplate
];
```

### 2. Template Guidelines

- **Positioning**: Use absolute pixel coordinates
- **Sizing**: Consider A4 page dimensions (595x842 pixels at 72 DPI)
- **Elements**: Include 2-5 elements for optimal usability
- **Text Types**: Use 'question' for interactive questions, 'text' for static content
- **Images**: Provide reasonable default sizes (150x100 to 300x200)

### 3. Testing New Templates

```typescript
// Validate template structure
import { validateTemplate } from '../utils/template-validation';

const validation = validateTemplate(newTemplate);
if (!validation.isValid) {
  console.error('Template validation failed:', validation.errors);
}
```

## Adding New Color Palettes

### 1. Create Palette Definition

```typescript
// In client/src/data/templates/color-palettes.ts
const newPalette: ColorPalette = {
  id: 'ocean-breeze',
  name: 'Ocean Breeze',
  colors: {
    primary: '#0ea5e9',      // Sky blue
    secondary: '#06b6d4',    // Cyan
    background: '#f0f9ff',   // Light blue
    text: '#0c4a6e',        // Dark blue
    accent: '#67e8f9'       // Light cyan
  }
};

// Add to colorPalettes array
export const colorPalettes: ColorPalette[] = [
  // ... existing palettes
  newPalette
];
```

### 2. Color Guidelines

- **Contrast**: Ensure text colors have sufficient contrast (WCAG AA: 4.5:1)
- **Harmony**: Use color theory principles (complementary, analogous, triadic)
- **Accessibility**: Test with color blindness simulators
- **Naming**: Use descriptive, memorable names

### 3. Color Validation

```typescript
// Check color contrast
function checkContrast(foreground: string, background: string): number {
  // Implementation would calculate WCAG contrast ratio
  // Return ratio (4.5+ for AA compliance, 7+ for AAA)
}

const contrastRatio = checkContrast(palette.colors.text, palette.colors.background);
if (contrastRatio < 4.5) {
  console.warn('Insufficient color contrast for accessibility');
}
```

## Integration Points

### 1. Editor Integration

```typescript
// Apply template to current page
const { applyTemplateToPage } = useEditor();
applyTemplateToPage(selectedTemplate);

// Access template state
const { state } = useEditor();
const availableTemplates = state.availableTemplates;
const selectedTemplate = state.selectedTemplate;
```

### 2. Wizard Integration

```typescript
// Use in book creation wizard
import TemplateSelectorStep from './components/templates/template-selector-step';
import { createBookFromWizard } from './utils/book-creation-utils';

// Wizard step component
<TemplateSelectorStep
  selection={wizardState.templateSelection}
  onSelectionChange={updateWizardState}
  onNext={goToNextStep}
  onBack={goToPreviousStep}
  onSkip={skipTemplateSelection}
/>

// Create book with template
const wizardData = {
  bookName: 'My Book',
  templateSelection: {
    templateId: 'structured-basic',
    paletteId: 'warm-sunset'
  }
  // ... other wizard data
};

const book = await createBookFromWizard(wizardData);
```

### 3. API Integration

```typescript
// Load templates from server (if needed)
const response = await fetch('/api/templates');
const templates = await response.json();
dispatch({ type: 'LOAD_TEMPLATES', payload: templates });

// Save custom templates
const response = await fetch('/api/templates', {
  method: 'POST',
  body: JSON.stringify(customTemplate)
});
```

## Performance Optimization

### 1. Thumbnail Caching

```typescript
// Preload thumbnails for better UX
import { preloadThumbnails } from '../utils/thumbnail-generator';

useEffect(() => {
  if (isGalleryOpen) {
    preloadThumbnails(pageTemplates);
  }
}, [isGalleryOpen]);
```

### 2. Lazy Loading

```typescript
// Lazy load template data
const [templates, setTemplates] = useState<PageTemplate[]>([]);

useEffect(() => {
  const loadTemplates = async () => {
    const { pageTemplates } = await import('../data/templates/page-templates');
    setTemplates(pageTemplates);
  };
  
  if (shouldLoadTemplates) {
    loadTemplates();
  }
}, [shouldLoadTemplates]);
```

### 3. Debounced Updates

```typescript
// Debounce customization preview updates
import { useMemo } from 'react';
import { debounce } from 'lodash';

const debouncedUpdatePreview = useMemo(
  () => debounce((customizations) => {
    updateTemplatePreview(customizations);
  }, 300),
  []
);
```

## Testing Scenarios

### 1. Template Application Tests

```typescript
// Test each template category
const categories = ['structured', 'playful', 'minimal', 'creative'];
categories.forEach(category => {
  const templates = getTemplatesByCategory(category);
  templates.forEach(template => {
    // Apply template and verify elements are created correctly
    applyTemplateToPage(template);
    expect(getCurrentPageElements()).toHaveLength(template.elements.length);
  });
});
```

### 2. Magic Wand Tests

```typescript
// Test magic wand with different categories
categories.forEach(category => {
  const result = applyMagicWand(category);
  expect(result.template.category).toBe(category);
  expect(result.palette).toBeDefined();
});
```

### 3. Responsive Tests

```typescript
// Test on different screen sizes
const viewports = [
  { width: 320, height: 568 },  // Mobile
  { width: 768, height: 1024 }, // Tablet
  { width: 1920, height: 1080 } // Desktop
];

viewports.forEach(viewport => {
  // Set viewport and test template gallery usability
  cy.viewport(viewport.width, viewport.height);
  cy.visit('/editor/123');
  cy.get('[data-testid="template-gallery"]').should('be.visible');
});
```

## Error Handling

### 1. Template Validation

```typescript
// Validate before application
const validation = validateTemplate(template);
if (!validation.isValid) {
  showError(`Template validation failed: ${validation.errors.join(', ')}`);
  return;
}
```

### 2. Graceful Fallbacks

```typescript
// Fallback to blank page if template fails
try {
  applyTemplateToPage(template);
} catch (error) {
  console.error('Template application failed:', error);
  // Create blank page instead
  dispatch({ type: 'ADD_PAGE' });
  showWarning('Template could not be applied. Created blank page instead.');
}
```

### 3. User-Friendly Messages

```typescript
const errorMessages = {
  TEMPLATE_NOT_FOUND: 'The selected template is no longer available.',
  VALIDATION_FAILED: 'The template contains invalid data.',
  APPLICATION_FAILED: 'Could not apply template. Please try again.',
  NETWORK_ERROR: 'Could not load templates. Check your connection.'
};
```

## Best Practices

### 1. Template Design

- Keep templates simple and focused
- Use consistent spacing and alignment
- Provide clear visual hierarchy
- Consider mobile responsiveness
- Test with real content

### 2. Color Palettes

- Limit to 4-6 colors maximum
- Ensure accessibility compliance
- Test in different lighting conditions
- Consider cultural color associations
- Provide both light and dark options

### 3. Performance

- Cache generated thumbnails
- Lazy load template data
- Debounce preview updates
- Optimize image assets
- Monitor bundle size impact

### 4. User Experience

- Provide clear category labels
- Show template previews
- Enable keyboard navigation
- Offer search functionality
- Include helpful tooltips

## Troubleshooting

### Common Issues

1. **Templates not loading**: Check data imports and file paths
2. **Thumbnails not generating**: Verify Canvas API support
3. **Colors not applying**: Check color palette structure
4. **Elements misaligned**: Verify coordinate calculations
5. **Performance issues**: Check for memory leaks in thumbnail generation

### Debug Tools

```typescript
// Enable template debugging
window.templateDebug = true;

// Log template application
console.log('Applying template:', template);
console.log('Generated elements:', convertTemplateToElements(template));

// Validate all templates
pageTemplates.forEach(template => {
  const validation = validateTemplate(template);
  if (!validation.isValid) {
    console.error(`Invalid template ${template.id}:`, validation.errors);
  }
});
```