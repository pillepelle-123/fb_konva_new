import { useState } from 'react';
import type { TemplateCategory } from '../../types/template-types';

interface MagicWandButtonProps {
  onApplyMagic: (category?: TemplateCategory) => void;
}

export default function MagicWandButton({ onApplyMagic }: MagicWandButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const categories: Array<{ key: TemplateCategory | undefined; label: string }> = [
    { key: undefined, label: 'Random from All' },
    { key: 'structured', label: 'Random Structured' },
    { key: 'playful', label: 'Random Playful' },
    { key: 'minimal', label: 'Random Minimal' },
    { key: 'creative', label: 'Random Creative' }
  ];

  const handleClick = (category?: TemplateCategory) => {
    setIsAnimating(true);
    onApplyMagic(category);
    setIsOpen(false);
    
    // Reset animation after effect
    setTimeout(() => setIsAnimating(false), 600);
  };

  return (
    <div className="relative">
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg
          hover:from-purple-600 hover:to-pink-600 transition-all duration-200
          flex items-center gap-2 shadow-lg hover:shadow-xl
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        title="Surprise me! Random template"
      >
        <span className={`text-lg ${isAnimating ? 'animate-spin' : ''}`}>✨</span>
        <span className="font-medium">Magic Wand</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
          {categories.map(category => (
            <button
              key={category.label}
              onClick={() => handleClick(category.key)}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {category.label}
            </button>
          ))}
        </div>
      )}

      {/* Sparkle animation overlay */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
          <div className="absolute top-1 right-1 w-1 h-1 bg-blue-300 rounded-full animate-ping animation-delay-100" />
          <div className="absolute bottom-1 left-2 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping animation-delay-200" />
          <div className="absolute bottom-0 right-0 w-1 h-1 bg-purple-300 rounded-full animate-ping animation-delay-300" />
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}