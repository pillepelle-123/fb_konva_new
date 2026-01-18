import { Eye, Paintbrush2 } from 'lucide-react';

import { GLOBAL_THEMES, getGlobalTheme } from '../../../../utils/global-themes';
import { SelectorShell, SelectorListSection } from './selector-shell';
import { Card } from '../../../ui/composites/card';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Separator } from '../../../ui';

interface ThemeSelectorProps {
  currentTheme?: string;
  selectedTheme?: string; // For template-selector/template-wrapper compatibility
  onThemeSelect: (themeId: string) => void;
  onPreviewClick?: (themeId: string) => void; // Optional - for preview functionality
  onBack?: () => void; // Optional - kept for backwards compatibility but not used in UI
  title?: string; // Optional for template-selector/template-wrapper
  skipShell?: boolean; // If true, return only the listSection without SelectorShell wrapper
  onCancel?: () => void;
  onApply?: () => void;
  canApply?: boolean;
  applyToEntireBook?: boolean;
  onApplyToEntireBookChange?: (checked: boolean) => void;
}

export function ThemeSelector({ 
  currentTheme, 
  selectedTheme, 
  onThemeSelect,
  onPreviewClick,
  title,
  skipShell = false,
  onCancel,
  onApply,
  canApply = false,
  applyToEntireBook = false,
  onApplyToEntireBookChange
}: ThemeSelectorProps) {
  // Use selectedTheme if provided (template-selector), otherwise use currentTheme (general-settings)
  const activeTheme = selectedTheme || currentTheme || 'default';
  const themes = GLOBAL_THEMES.map(theme => theme.id);
  
  const activeThemeObj = getGlobalTheme(activeTheme);

  const listSection = (
    <SelectorListSection
      title={
        <>
          <Paintbrush2 className="h-4 w-4" />
          {title || 'Themes'}
        </>
      }
      className=""
      scrollClassName="min-h-0"
      onCancel={skipShell ? undefined : onCancel}
      onApply={skipShell ? undefined : onApply}
      canApply={canApply}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={skipShell ? undefined : onApplyToEntireBookChange}
      beforeList={(
        <div className="space-y-2 mb-3 w-full">
          <div className="flex items-start gap-2 px-2">
            <div className="flex-1 text-left">
              <div className="text-xs font-medium mb-1">
                {activeThemeObj?.name} (selected)
              </div>
              <div className="text-xs text-gray-600">
                {activeThemeObj?.description || 'Theme styling'}
              </div>
            </div>
          </div>
          <Separator />
        </div>
      )}
    >
      {themes.map((themeId) => {
        const theme = getGlobalTheme(themeId);
        if (!theme) return null;

        const isActive = activeTheme === themeId;
        
        return (
          <Card
            key={themeId}
            onClick={() => onThemeSelect(themeId)}
            className={`w-full p-3 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
              isActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">{theme.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                {theme.description || 'Theme styling'}
              </div>
            </div>
            {onPreviewClick && (
              <Tooltip side="left" content="Preview Page with this Theme">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onPreviewClick(themeId);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="flex-shrink-0"
                  type="button"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </Button>
              </Tooltip>
            )}
          </Card>
        );
      })}
    </SelectorListSection>
  );

  if (skipShell) {
    return listSection;
  }

  return (
    <SelectorShell
      listSection={listSection}
    />
  );
}

