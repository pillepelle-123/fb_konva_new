import { useState, useEffect } from 'react';
import type { PageTemplate } from '../../types/template-types';
import { getThumbnail } from '../../utils/thumbnail-generator';

interface TemplateCardProps {
  template: PageTemplate;
  isSelected: boolean;
  onClick: (template: PageTemplate) => void;
  onQuickApply?: (template: PageTemplate) => void;
}

export default function TemplateCard({ template, isSelected, onClick, onQuickApply }: TemplateCardProps) {
  const [thumbnail, setThumbnail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  
  const categoryColors = {
    structured: 'bg-blue-100 text-blue-800',
    playful: 'bg-pink-100 text-pink-800',
    minimal: 'bg-gray-100 text-gray-800',
    creative: 'bg-purple-100 text-purple-800'
  };
  
  useEffect(() => {
    const generateThumbnail = async () => {
      setIsLoading(true);
      try {
        const thumbnailData = getThumbnail(template);
        setThumbnail(thumbnailData);
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    generateThumbnail();
  }, [template]);
  
  const questionCount = template.elements.filter(el => el.type === 'text' && el.textType === 'question').length;
  const imageSlots = template.elements.filter(el => el.type === 'image').length;
  
  const handleQuickApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickApply?.(template);
  };

  return (
    <div
      className={`
        relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300 group
        hover:scale-105 hover:shadow-xl
        ${isSelected 
          ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' 
          : 'border border-gray-200 hover:border-gray-300'
        }
      `}
      onClick={() => onClick(template)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[4/5] relative overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : thumbnail ? (
          <img 
            src={thumbnail} 
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
            style={{ backgroundColor: template.colorPalette.background }}
          >
            <div className="text-gray-400 text-sm">Preview</div>
          </div>
        )}
        
        {isHovered && onQuickApply && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center transition-opacity duration-200">
            <button
              onClick={handleQuickApply}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 transform hover:scale-105"
            >
              Quick Apply
            </button>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm p-3 transition-all duration-200">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm text-gray-900 truncate">{template.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[template.category]}`}>
            {template.category}
          </span>
        </div>
        
        {isHovered && (
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {questionCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {questionCount} questions
              </span>
            )}
            {imageSlots > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                {imageSlots} images
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}