import { useState } from 'react';
import { Button } from '../../ui/primitives/button';
import { ChevronLeft } from 'lucide-react';
import { GLOBAL_THEMES, type GlobalTheme } from '../../../utils/global-themes';

interface GlobalThemeSelectorProps {
  currentTheme?: string;
  onThemeSelect: (themeId: string) => void;
  onBack: () => void;
  title: string;
}

export function GlobalThemeSelector({ currentTheme, onThemeSelect, onBack, title }: GlobalThemeSelectorProps) {
  return (
    <div className="space-y-4">
      {/* <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="px-2 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div> */}
      
      <div className="space-y-2">
        {GLOBAL_THEMES.map((theme) => (
          <Button
            key={theme.id}
            variant={currentTheme === theme.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onThemeSelect(theme.id)}
            className="w-full justify-start text-left"
          >
            <div>
              <div className="font-medium">{theme.name}</div>
              <div className="text-xs">{theme.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}