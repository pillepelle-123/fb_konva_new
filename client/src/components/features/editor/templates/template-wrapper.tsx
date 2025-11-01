import { useState } from 'react';
import { Switch } from '../../../ui/primitives/switch';
import { Button } from '../../../ui/primitives/button';
import { TemplateLayout } from './template-layout';
import { TemplateTheme } from './template-theme';
import { TemplatePalette } from './template-palette';
import type { PageTemplate, ColorPalette } from '../../../../types/template-types';

interface TemplateWrapperProps {
  type: 'layouts' | 'themes' | 'palettes';
  onApply: (applyToAll: boolean, selectedLayout?: PageTemplate | null, selectedTheme?: string, selectedPalette?: ColorPalette | null) => void;
  onCancel: () => void;
  isBookLevel?: boolean;
}

export function TemplateWrapper({ type, onApply, onCancel, isBookLevel = false }: TemplateWrapperProps) {
  const [applyToAll, setApplyToAll] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<PageTemplate | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);

  const hasSelection = () => {
    switch (type) {
      case 'layouts': return selectedLayout !== null;
      case 'themes': return selectedTheme !== 'default';
      case 'palettes': return selectedPalette !== null;
      default: return false;
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'layouts':
        return (
          <TemplateLayout
            selectedLayout={selectedLayout}
            onLayoutSelect={setSelectedLayout}
          />
        );
      case 'themes':
        return (
          <TemplateTheme
            selectedTheme={selectedTheme}
            onThemeSelect={setSelectedTheme}
          />
        );
      case 'palettes':
        return (
          <TemplatePalette
            selectedPalette={selectedPalette}
            onPaletteSelect={setSelectedPalette}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1">
        {renderContent()}
      </div>
      
      {/* Controls */}
      <div className="border-t bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          {!isBookLevel && (
            <div className="flex items-center gap-3">
              <Switch
                checked={applyToAll}
                onCheckedChange={setApplyToAll}
              />
              <span className="text-sm">
                {applyToAll ? 'Apply to all pages of the book' : 'Apply only for current page'}
              </span>
            </div>
          )}
          {isBookLevel && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Apply to entire book
              </span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={() => onApply(applyToAll, selectedLayout, selectedTheme, selectedPalette)}
              disabled={!hasSelection()}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}