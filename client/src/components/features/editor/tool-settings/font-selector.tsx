import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Type } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { FONT_GROUPS, getFontFamily } from '../../../../utils/font-families';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';

interface FontSelectorProps {
  currentFont: string;
  isBold: boolean;
  isItalic: boolean;
  onFontSelect: (fontName: string) => void;
  onBack: () => void;
  element?: any;
  state?: any;
}

export function FontSelector({ currentFont, isBold, isItalic, onFontSelect, onBack, element, state }: FontSelectorProps) {
  const getCurrentFontName = () => {
    let fontFamily = currentFont;
    
    // If no fontFamily provided, try to get from theme defaults
    if (!fontFamily && element && state) {
      const currentPage = state.currentBook?.pages[state.activePageIndex];
      const pageTheme = currentPage?.background?.pageTheme;
      const bookTheme = state.currentBook?.bookTheme;
      const activeTheme = pageTheme || bookTheme;
      
      if (activeTheme) {
        const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || element.type || 'text');
        fontFamily = themeDefaults?.font?.fontFamily || themeDefaults?.fontFamily;
      }
    }
    
    if (!fontFamily) return "Arial";
    
    for (const group of FONT_GROUPS) {
      const font = group.fonts.find(f => 
        f.family === fontFamily || 
        f.bold === fontFamily || 
        f.italic === fontFamily
      );
      if (font) return font.name;
    }
    return "Arial";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="px-2 h-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      {FONT_GROUPS.map((group, groupIndex) => (
        <div key={group.name}>
          {groupIndex > 0 && <Separator />}
          <Label variant="xs" className="text-muted-foreground mb-2 block">
            {group.name}
          </Label>
          <div className="space-y-1">
            {group.fonts.map((font) => {
              const fontFamily = getFontFamily(font.name, isBold, isItalic);
              const isSelected = getCurrentFontName() === font.name;
              
              return (
                <Button
                  key={font.name}
                  variant={isSelected ? "default" : "ghost_hover"}
                  size="sm"
                  onClick={() => onFontSelect(font.name)}
                  className="w-full justify-start text-left h-auto py-2"
                  style={{ fontFamily }}
                >
                  <Type className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{font.name}</span>
                  <span className="ml-2 text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>({font.name})</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}