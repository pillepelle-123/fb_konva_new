import { useState, useEffect, useCallback } from 'react';
import type { PageTemplate, TemplateCategory } from '../../types/template-types';
import { pageTemplates } from '../../data/templates/page-templates';
import { getTemplatesByCategory } from '../../utils/template-utils';
import { applyMagicWand } from '../../utils/magic-wand';
import { useEditor } from '../../context/editor-context';
import TemplateCard from './template-card';
import TemplatePreview from './template-preview';
import TemplateCustomizer from './template-customizer';
import MagicWandButton from './magic-wand-button';
import TemplateHelp from './template-help';
import { preloadThumbnails } from '../../utils/thumbnail-generator';
import { validateTemplate, checkTemplateCompatibility, sanitizeTemplate } from '../../utils/template-validation';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortOption = 'popular' | 'newest' | 'most-questions' | 'least-questions';

export default function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const { applyTemplateToPage, state } = useEditor();
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>(() => {
    return (localStorage.getItem('template-gallery-category') as TemplateCategory | 'all') || 'all';
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    return (localStorage.getItem('template-gallery-sort') as SortOption) || 'popular';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [magicNotification, setMagicNotification] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: Array<{ key: TemplateCategory | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'structured', label: 'Structured' },
    { key: 'playful', label: 'Playful' },
    { key: 'minimal', label: 'Minimal' },
    { key: 'creative', label: 'Creative' }
  ];

  // Filter and sort templates
  const filteredAndSortedTemplates = useCallback(() => {
    let templates = activeCategory === 'all' 
      ? pageTemplates 
      : getTemplatesByCategory(activeCategory);
    
    // Apply search filter
    if (searchQuery.trim()) {
      templates = templates.filter(template => 
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return [...templates].reverse(); // Assuming templates are ordered by creation
      case 'most-questions':
        return [...templates].sort((a, b) => {
          const aQuestions = a.elements.filter(el => el.type === 'text' && el.textType === 'question').length;
          const bQuestions = b.elements.filter(el => el.type === 'text' && el.textType === 'question').length;
          return bQuestions - aQuestions;
        });
      case 'least-questions':
        return [...templates].sort((a, b) => {
          const aQuestions = a.elements.filter(el => el.type === 'text' && el.textType === 'question').length;
          const bQuestions = b.elements.filter(el => el.type === 'text' && el.textType === 'question').length;
          return aQuestions - bQuestions;
        });
      case 'popular':
      default:
        return templates; // Keep original order for popular
    }
  }, [activeCategory, searchQuery, sortBy]);
  
  const filteredTemplates = filteredAndSortedTemplates();

  // Preload thumbnails when gallery opens
  useEffect(() => {
    if (isOpen) {
      preloadThumbnails(pageTemplates);
    }
  }, [isOpen]);
  
  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('template-gallery-category', activeCategory);
  }, [activeCategory]);
  
  useEffect(() => {
    localStorage.setItem('template-gallery-sort', sortBy);
  }, [sortBy]);
  
  // Auto-select first template when templates change
  useEffect(() => {
    if (isOpen && filteredTemplates.length > 0) {
      if (!selectedTemplate || !filteredTemplates.find(t => t.id === selectedTemplate.id)) {
        setSelectedTemplate(filteredTemplates[0]);
        setSelectedIndex(0);
      }
    }
  }, [isOpen, filteredTemplates, selectedTemplate]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'Enter':
          if (selectedTemplate) {
            handleApply();
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = Math.min(prev + 1, filteredTemplates.length - 1);
            setSelectedTemplate(filteredTemplates[newIndex]);
            return newIndex;
          });
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = Math.max(prev - 1, 0);
            setSelectedTemplate(filteredTemplates[newIndex]);
            return newIndex;
          });
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTemplate, filteredTemplates, onClose]);
  
  if (!isOpen) return null;

  // Handle category change with animation
  const handleCategoryChange = (category: TemplateCategory | 'all') => {
    setActiveCategory(category);
    setSelectedIndex(0);
  };

  const handleApply = async () => {
    if (selectedTemplate && !isApplying) {
      setIsApplying(true);
      setError(null);
      
      try {
        // Validate template
        const validation = validateTemplate(selectedTemplate);
        if (!validation.isValid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Sanitize template data
        const sanitizedTemplate = sanitizeTemplate(selectedTemplate);
        if (!sanitizedTemplate) {
          throw new Error('Failed to process template data');
        }
        
        // Check compatibility
        const currentPage = state.currentBook?.pages[state.activePageIndex];
        if (currentPage) {
          const compatibility = checkTemplateCompatibility(sanitizedTemplate, currentPage.elements);
          if (compatibility.warnings.length > 0) {
            console.warn('Template compatibility warnings:', compatibility.warnings);
          }
        }
        
        applyTemplateToPage(sanitizedTemplate);
        onClose();
        console.log('Template applied successfully:', sanitizedTemplate.name);
      } catch (error) {
        console.error('Failed to apply template:', error);
        setError(error instanceof Error ? error.message : 'Failed to apply template');
      } finally {
        setIsApplying(false);
      }
    }
  };
  
  const handleQuickApply = async (template: PageTemplate) => {
    if (!isApplying) {
      setIsApplying(true);
      try {
        applyTemplateToPage(template);
        onClose();
      } catch (error) {
        console.error('Failed to apply template:', error);
      } finally {
        setIsApplying(false);
      }
    }
  };

  const handleCustomize = () => {
    if (selectedTemplate) {
      setShowCustomizer(true);
    }
  };

  const handleCustomizerClose = () => {
    setShowCustomizer(false);
  };

  const handleBackToGallery = () => {
    setShowCustomizer(false);
  };

  const handleMagicWand = (category?: TemplateCategory) => {
    const result = applyMagicWand(category);
    applyTemplateToPage(result.template);
    
    // Show notification
    setMagicNotification(`Applied "${result.templateName}" with "${result.paletteName}" palette`);
    setTimeout(() => setMagicNotification(null), 4000);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col transform transition-all duration-300 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Choose a Template</h2>
              <p className="text-sm text-gray-600 mt-1">Choose a pre-designed layout to quickly create beautiful pages</p>
            </div>
            <MagicWandButton onApplyMagic={handleMagicWand} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Learn More"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="px-6 py-4 border-b space-y-4">
          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category filters and sort */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryChange(category.key)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105
                    ${activeCategory === category.key
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {category.label}
                </button>
              ))}
            </div>
            
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="most-questions">Most Questions</option>
              <option value="least-questions">Least Questions</option>
            </select>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Template grid */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium mb-2">No templates found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <TemplateCard
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onClick={(t) => {
                        setSelectedTemplate(t);
                        setSelectedIndex(index);
                      }}
                      onQuickApply={handleQuickApply}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview section */}
          {selectedTemplate && (
            <div className="w-96 border-l bg-gray-50 p-6 overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Preview</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedTemplate.name}</h4>
                  <p className="text-sm text-gray-600 capitalize">{selectedTemplate.category} layout</p>
                </div>

                {/* Visual Preview */}
                <div>
                  <TemplatePreview template={selectedTemplate} width={280} height={350} />
                </div>

                <div>
                  <span className="text-gray-600 text-sm">Theme:</span>
                  <div className="font-medium capitalize">{selectedTemplate.theme}</div>
                </div>

                <div>
                  <span className="text-gray-600 text-sm">Color Palette:</span>
                  <div className="flex gap-2 mt-2">
                    {Object.entries(selectedTemplate.colorPalette).map(([key, color]) => (
                      <div
                        key={key}
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: color }}
                        title={key}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCustomize}
            disabled={!selectedTemplate}
            className={`
              px-4 py-2 rounded-md transition-colors
              ${selectedTemplate
                ? 'bg-gray-500 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Customize
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedTemplate || isApplying}
            className={`
              px-4 py-2 rounded-md transition-all duration-200 flex items-center gap-2
              ${selectedTemplate && !isApplying
                ? 'bg-blue-500 text-white hover:bg-blue-600 transform hover:scale-105'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isApplying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Applying...
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>
      
      {/* Template Customizer */}
      <TemplateCustomizer
        isOpen={showCustomizer}
        template={selectedTemplate}
        onClose={handleCustomizerClose}
        onBack={handleBackToGallery}
      />
      
      {/* Magic notification */}
      {magicNotification && (
        <div className="fixed top-4 right-4 z-60 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in-right">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span>{magicNotification}</span>
          </div>
        </div>
      )}
      
      {/* Help modal */}
      <TemplateHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }
  
  .animate-scale-in {
    animation: scale-in 0.3s ease-out;
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.4s ease-out both;
  }
`;
if (!document.head.querySelector('style[data-template-gallery]')) {
  style.setAttribute('data-template-gallery', 'true');
  document.head.appendChild(style);
}