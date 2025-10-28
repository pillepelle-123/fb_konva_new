import type { PageTemplate, ColorPalette } from '../types/template-types';
import type { Book, Page, CanvasElement } from '../context/editor-context';
import { convertTemplateToElements } from './template-to-elements';
import { pageTemplates } from '../data/templates/page-templates';
import { colorPalettes } from '../data/templates/color-palettes';

/**
 * Wizard data structure for book creation
 * This represents the complete data collected during the wizard flow
 */
export interface WizardData {
  // Basic book information
  bookName: string;
  pageSize: string;
  orientation: string;
  
  // Collaborators and permissions
  collaborators?: Array<{
    id: number;
    name: string;
    email: string;
    role: 'author' | 'publisher';
    pageAccessLevel: 'own_page' | 'all_pages';
    editorInteractionLevel: 'answer_only' | 'full_edit' | 'full_edit_with_settings';
  }>;
  
  // Questions from question pool
  selectedQuestions?: Array<{
    id: string;
    text: string;
    poolId?: number;
  }>;
  
  // Template and theme selection
  templateSelection?: {
    templateId: string;
    paletteId: string;
    customizations?: any;
  };
  
  // Special pages configuration
  specialPages?: {
    coverPage?: boolean;
    indexPage?: boolean;
    thanksPage?: boolean;
  };
  
  // Initial page count
  pageCount?: number;
}

/**
 * Apply a template to all pages in a book
 * Used when creating a book from wizard with consistent template across pages
 */
export async function applyTemplateToAllPages(
  bookId: string, 
  template: PageTemplate, 
  palette: ColorPalette
): Promise<void> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');
    
    // Get current book data
    const bookResponse = await fetch(`${apiUrl}/books/${bookId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!bookResponse.ok) {
      throw new Error('Failed to fetch book data');
    }
    
    const book: Book = await bookResponse.json();
    
    // Apply template to each page
    const updatedPages = book.pages.map(page => {
      // Create template with custom palette
      const templateWithPalette = {
        ...template,
        colorPalette: palette.colors
      };
      
      // Convert template to elements
      const templateElements = convertTemplateToElements(templateWithPalette);
      
      // Update page background
      const updatedPage: Page = {
        ...page,
        background: {
          type: template.background.type,
          value: template.background.value,
          opacity: 1,
          pageTheme: template.theme
        },
        elements: templateElements
      };
      
      return updatedPage;
    });
    
    // Save updated book
    const updateResponse = await fetch(`${apiUrl}/books/${bookId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...book,
        pages: updatedPages,
        bookTheme: template.theme
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error('Failed to update book with template');
    }
    
  } catch (error) {
    console.error('Error applying template to all pages:', error);
    throw error;
  }
}

/**
 * Create a complete book from wizard data
 * This is the main function that orchestrates the entire book creation process
 */
export async function createBookFromWizard(wizardData: WizardData): Promise<Book> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('token');
    
    // Step 1: Create basic book
    const bookResponse = await fetch(`${apiUrl}/books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: wizardData.bookName,
        pageSize: wizardData.pageSize,
        orientation: wizardData.orientation,
        bookTheme: wizardData.templateSelection?.templateId || 'default'
      })
    });
    
    if (!bookResponse.ok) {
      throw new Error('Failed to create book');
    }
    
    const book: Book = await bookResponse.json();
    
    // Step 2: Add collaborators if any
    if (wizardData.collaborators && wizardData.collaborators.length > 0) {
      for (const collaborator of wizardData.collaborators) {
        await fetch(`${apiUrl}/books/${book.id}/friends`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            friendId: collaborator.id,
            book_role: collaborator.role,
            page_access_level: collaborator.pageAccessLevel,
            editor_interaction_level: collaborator.editorInteractionLevel
          })
        });
      }
    }
    
    // Step 3: Add questions if any
    if (wizardData.selectedQuestions && wizardData.selectedQuestions.length > 0) {
      for (const question of wizardData.selectedQuestions) {
        await fetch(`${apiUrl}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            id: question.id,
            bookId: book.id,
            questionText: question.text,
            questionPoolId: question.poolId
          })
        });
      }
    }
    
    // Step 4: Apply template and palette if selected
    if (wizardData.templateSelection) {
      const template = pageTemplates.find(t => t.id === wizardData.templateSelection!.templateId);
      const palette = colorPalettes.find(p => p.id === wizardData.templateSelection!.paletteId);
      
      if (template && palette) {
        await applyTemplateToAllPages(book.id.toString(), template, palette);
      }
    }
    
    // Step 5: Add special pages if configured
    if (wizardData.specialPages) {
      const specialPagesToAdd = [];
      
      if (wizardData.specialPages.coverPage) {
        specialPagesToAdd.push({
          pageNumber: 0, // Insert at beginning
          type: 'cover'
        });
      }
      
      if (wizardData.specialPages.indexPage) {
        specialPagesToAdd.push({
          pageNumber: 1, // Insert after cover or at beginning
          type: 'index'
        });
      }
      
      if (wizardData.specialPages.thanksPage) {
        specialPagesToAdd.push({
          pageNumber: -1, // Insert at end
          type: 'thanks'
        });
      }
      
      // Add special pages (implementation would depend on your special page system)
      for (const specialPage of specialPagesToAdd) {
        // This would call your special page creation API
        // Implementation depends on how special pages are handled in your system
      }
    }
    
    // Step 6: Create additional pages if specified
    if (wizardData.pageCount && wizardData.pageCount > 1) {
      const pagesToCreate = wizardData.pageCount - 1; // -1 because book starts with 1 page
      
      for (let i = 0; i < pagesToCreate; i++) {
        await fetch(`${apiUrl}/books/${book.id}/pages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    }
    
    return book;
    
  } catch (error) {
    console.error('Error creating book from wizard:', error);
    throw error;
  }
}

/**
 * Get wizard template selection from editor context
 * This function bridges the wizard and editor contexts
 */
export function getWizardTemplateSelection(): {
  templateId: string | null;
  paletteId: string | null;
  customizations?: any;
} {
  // This would typically be called from a wizard context
  // For now, return a default structure
  return {
    templateId: null,
    paletteId: null,
    customizations: undefined
  };
}

/**
 * Validate wizard data before book creation
 * Ensures all required fields are present and valid
 */
export function validateWizardData(wizardData: WizardData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate required fields
  if (!wizardData.bookName || wizardData.bookName.trim().length === 0) {
    errors.push('Book name is required');
  }
  
  if (!wizardData.pageSize) {
    errors.push('Page size is required');
  }
  
  if (!wizardData.orientation) {
    errors.push('Page orientation is required');
  }
  
  // Validate template selection if provided
  if (wizardData.templateSelection) {
    const template = pageTemplates.find(t => t.id === wizardData.templateSelection!.templateId);
    const palette = colorPalettes.find(p => p.id === wizardData.templateSelection!.paletteId);
    
    if (!template) {
      errors.push('Selected template not found');
    }
    
    if (!palette) {
      errors.push('Selected color palette not found');
    }
  }
  
  // Validate collaborators if provided
  if (wizardData.collaborators) {
    wizardData.collaborators.forEach((collaborator, index) => {
      if (!collaborator.id || !collaborator.name || !collaborator.email) {
        errors.push(`Collaborator ${index + 1} is missing required information`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example wizard flow integration
 * This shows how the wizard steps would work together
 */
export const WIZARD_FLOW_EXAMPLE = {
  // Step 1: Basic Information
  basicInfo: {
    bookName: 'My Friendship Book',
    pageSize: 'A4',
    orientation: 'portrait'
  },
  
  // Step 2: Collaborators (optional)
  collaborators: [
    {
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'author' as const,
      pageAccessLevel: 'own_page' as const,
      editorInteractionLevel: 'full_edit' as const
    }
  ],
  
  // Step 3: Questions (optional)
  questions: [
    {
      id: 'q1',
      text: 'What is your favorite color?',
      poolId: 1
    }
  ],
  
  // Step 4: Template & Theme (handled by TemplateSelectorStep)
  templateSelection: {
    templateId: 'structured-basic',
    paletteId: 'warm-sunset',
    customizations: {}
  },
  
  // Step 5: Special Pages (optional)
  specialPages: {
    coverPage: true,
    indexPage: false,
    thanksPage: true
  },
  
  // Step 6: Canvas Editor (redirect to editor)
  // After book creation, redirect to /editor/{bookId}
};