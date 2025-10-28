# Template System Testing Guide

## Test Scenarios

### 1. Template Application Tests

#### Basic Template Application
```typescript
describe('Template Application', () => {
  test('should apply structured template correctly', async () => {
    const template = pageTemplates.find(t => t.category === 'structured');
    await applyTemplateToPage(template);
    
    const pageElements = getCurrentPageElements();
    expect(pageElements).toHaveLength(template.elements.length);
    expect(pageElements[0].type).toBe(template.elements[0].type);
  });

  test('should handle template with existing content', async () => {
    // Add existing content
    addElementToPage({ type: 'text', x: 100, y: 100 });
    
    const template = pageTemplates[0];
    const confirmed = window.confirm = jest.fn(() => true);
    
    await applyTemplateToPage(template);
    
    expect(confirmed).toHaveBeenCalledWith(
      'This will replace existing elements. Continue?'
    );
  });
});
```

#### Category-Specific Tests
```typescript
describe('Template Categories', () => {
  const categories = ['structured', 'playful', 'minimal', 'creative'];
  
  categories.forEach(category => {
    test(`should apply ${category} templates correctly`, async () => {
      const templates = getTemplatesByCategory(category);
      
      for (const template of templates) {
        await applyTemplateToPage(template);
        
        // Verify elements are created
        const elements = getCurrentPageElements();
        expect(elements.length).toBeGreaterThan(0);
        
        // Verify background is applied
        const background = getCurrentPageBackground();
        expect(background.type).toBe(template.background.type);
        expect(background.value).toBe(template.background.value);
        
        // Clear page for next test
        clearCurrentPage();
      }
    });
  });
});
```

### 2. Magic Wand Tests

```typescript
describe('Magic Wand Feature', () => {
  test('should apply random template from all categories', () => {
    const result = applyMagicWand();
    
    expect(result.template).toBeDefined();
    expect(result.templateName).toBeTruthy();
    expect(result.paletteName).toBeTruthy();
    expect(pageTemplates).toContain(result.template);
  });

  test('should apply random template from specific category', () => {
    const category = 'structured';
    const result = applyMagicWand(category);
    
    expect(result.template.category).toBe(category);
  });

  test('should handle empty category gracefully', () => {
    const result = applyMagicWand('nonexistent' as any);
    
    // Should fallback to all templates
    expect(result.template).toBeDefined();
  });
});
```

### 3. Template Customization Tests

```typescript
describe('Template Customization', () => {
  test('should apply color palette changes', async () => {
    const template = pageTemplates[0];
    const customPalette = {
      primary: '#ff0000',
      secondary: '#00ff00',
      background: '#0000ff',
      text: '#ffffff'
    };
    
    const customizedTemplate = applyColorPalette(template, customPalette);
    await applyTemplateToPage(customizedTemplate);
    
    // Verify colors are applied to elements
    const elements = getCurrentPageElements();
    const textElement = elements.find(el => el.type === 'text');
    expect(textElement.style.color).toBe(customPalette.text);
  });

  test('should validate color contrast', () => {
    const palette = {
      primary: '#ffffff',
      background: '#ffffff', // Poor contrast
      text: '#ffffff'
    };
    
    const validation = validateColorPalette(palette);
    expect(validation.warnings).toContain(
      expect.stringContaining('contrast')
    );
  });
});
```

### 4. Responsive Behavior Tests

```typescript
describe('Responsive Template Behavior', () => {
  const viewports = [
    { width: 320, height: 568, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' }
  ];

  viewports.forEach(viewport => {
    test(`should display template gallery correctly on ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/editor/123');
      
      // Open template gallery
      cy.get('[data-testid="templates-button"]').click();
      
      // Verify gallery is visible and usable
      cy.get('[data-testid="template-gallery"]').should('be.visible');
      cy.get('[data-testid="template-card"]').should('have.length.greaterThan', 0);
      
      // Test template selection
      cy.get('[data-testid="template-card"]').first().click();
      cy.get('[data-testid="apply-button"]').should('be.enabled');
    });
  });

  test('should handle touch interactions on mobile', () => {
    cy.viewport(320, 568);
    cy.visit('/editor/123');
    
    cy.get('[data-testid="templates-button"]').click();
    
    // Test touch scrolling
    cy.get('[data-testid="template-grid"]')
      .trigger('touchstart', { touches: [{ clientX: 100, clientY: 200 }] })
      .trigger('touchmove', { touches: [{ clientX: 100, clientY: 100 }] })
      .trigger('touchend');
    
    // Verify scroll worked
    cy.get('[data-testid="template-grid"]').should('have.prop', 'scrollTop').and('be.greaterThan', 0);
  });
});
```

### 5. Performance Tests

```typescript
describe('Template Performance', () => {
  test('should load template gallery within acceptable time', async () => {
    const startTime = performance.now();
    
    await openTemplateGallery();
    
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(1000); // Should load within 1 second
  });

  test('should generate thumbnails efficiently', async () => {
    const templates = pageTemplates.slice(0, 10);
    const startTime = performance.now();
    
    const thumbnails = await Promise.all(
      templates.map(template => generateTemplateThumbnail(template))
    );
    
    const generationTime = performance.now() - startTime;
    expect(generationTime).toBeLessThan(2000); // 10 thumbnails in under 2 seconds
    expect(thumbnails.every(thumb => thumb.length > 0)).toBe(true);
  });

  test('should handle memory usage efficiently', async () => {
    const initialMemory = getMemoryUsage();
    
    // Generate many thumbnails
    for (let i = 0; i < 50; i++) {
      await generateTemplateThumbnail(pageTemplates[i % pageTemplates.length]);
    }
    
    const finalMemory = getMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

### 6. Error Handling Tests

```typescript
describe('Template Error Handling', () => {
  test('should handle missing template gracefully', async () => {
    const invalidTemplate = { id: 'nonexistent' };
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await expect(applyTemplateToPage(invalidTemplate)).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should validate template data before application', async () => {
    const invalidTemplate = {
      id: 'invalid',
      name: 'Invalid Template',
      // Missing required fields
    };
    
    const validation = validateTemplate(invalidTemplate);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should show user-friendly error messages', async () => {
    const mockShowError = jest.fn();
    window.showError = mockShowError;
    
    const corruptedTemplate = {
      id: 'corrupted',
      elements: 'invalid-data' // Should be array
    };
    
    await applyTemplateToPage(corruptedTemplate);
    
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Template validation failed')
    );
  });

  test('should fallback to blank page if template fails', async () => {
    const failingTemplate = {
      id: 'failing',
      elements: [{ invalid: 'element' }]
    };
    
    const initialPageCount = getCurrentBook().pages.length;
    
    await applyTemplateToPage(failingTemplate);
    
    // Should create blank page instead
    expect(getCurrentBook().pages.length).toBe(initialPageCount + 1);
    expect(getCurrentPageElements()).toHaveLength(0);
  });
});
```

### 7. Integration Tests

```typescript
describe('Template System Integration', () => {
  test('should integrate with editor context', async () => {
    const { result } = renderHook(() => useEditor());
    
    act(() => {
      result.current.dispatch({
        type: 'LOAD_TEMPLATES',
        payload: pageTemplates
      });
    });
    
    expect(result.current.state.availableTemplates).toEqual(pageTemplates);
  });

  test('should integrate with wizard flow', async () => {
    const wizardData = {
      bookName: 'Test Book',
      templateSelection: {
        templateId: 'structured-basic',
        paletteId: 'warm-sunset'
      }
    };
    
    const book = await createBookFromWizard(wizardData);
    
    expect(book.bookTheme).toBe('structured-basic');
    expect(book.pages[0].background.pageTheme).toBe('structured-basic');
  });
});
```

## Manual Testing Checklist

### Template Gallery
- [ ] Gallery opens smoothly with animation
- [ ] All template categories display correctly
- [ ] Search functionality works
- [ ] Sort options function properly
- [ ] Keyboard navigation works (arrows, enter, escape)
- [ ] Template previews load correctly
- [ ] Quick apply buttons work on hover
- [ ] Help documentation is accessible

### Template Application
- [ ] Templates apply without errors
- [ ] Existing content warning appears when needed
- [ ] Elements are positioned correctly
- [ ] Colors are applied properly
- [ ] Background settings work
- [ ] Undo/redo works after template application

### Customization
- [ ] Color palette selector works
- [ ] Preview updates in real-time
- [ ] Custom colors can be applied
- [ ] Reset to defaults works
- [ ] Customizations persist during session

### Performance
- [ ] Gallery loads quickly (< 2 seconds)
- [ ] Thumbnails generate without blocking UI
- [ ] Smooth scrolling in template grid
- [ ] No memory leaks during extended use
- [ ] Responsive on different screen sizes

### Error Scenarios
- [ ] Graceful handling of network errors
- [ ] Clear error messages for users
- [ ] Recovery from corrupted template data
- [ ] Fallback behavior when templates fail

## Automated Test Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/components/templates/**/*.{ts,tsx}',
    'src/utils/template-*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Cypress Configuration
```javascript
// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/templates/**/*.cy.{js,jsx,ts,tsx}'
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    specPattern: 'src/components/templates/**/*.cy.{js,jsx,ts,tsx}'
  }
};
```

### Test Data Setup
```typescript
// src/test-utils/template-test-data.ts
export const mockTemplates: PageTemplate[] = [
  {
    id: 'test-structured',
    name: 'Test Structured',
    category: 'structured',
    theme: 'default',
    elements: [
      {
        id: 'test-text',
        type: 'text',
        x: 50,
        y: 50,
        width: 200,
        height: 40,
        textType: 'question'
      }
    ],
    background: { type: 'color', value: '#ffffff' },
    colorPalette: {
      primary: '#000000',
      secondary: '#666666',
      background: '#ffffff',
      text: '#333333'
    }
  }
];

export const mockColorPalettes: ColorPalette[] = [
  {
    id: 'test-palette',
    name: 'Test Palette',
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      background: '#ffffff',
      text: '#000000'
    }
  }
];
```

## Performance Benchmarks

### Target Metrics
- Template gallery load time: < 1 second
- Thumbnail generation: < 200ms per template
- Template application: < 500ms
- Memory usage: < 100MB for 50 templates
- Search response time: < 100ms

### Monitoring
```typescript
// Performance monitoring setup
const performanceObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('template')) {
      console.log(`${entry.name}: ${entry.duration}ms`);
    }
  }
});

performanceObserver.observe({ entryTypes: ['measure'] });

// Mark performance points
performance.mark('template-gallery-start');
// ... template gallery code
performance.mark('template-gallery-end');
performance.measure('template-gallery-load', 'template-gallery-start', 'template-gallery-end');
```