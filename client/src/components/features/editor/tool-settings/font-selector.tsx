import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, Type } from 'lucide-react';
import { Label } from '../../../ui/primitives/label';
import { Separator } from '../../../ui/primitives/separator';
import { FONT_GROUPS, getFontFamily } from '../../../../utils/font-families';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { Tooltip } from '../../../ui/composites/tooltip';

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
  let fontFamily = currentFont || element?.font?.fontFamily || element?.fontFamily;
  
  if (!fontFamily && element && state) {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.bookTheme;
    const activeTheme = pageTheme || bookTheme;
    
    if (activeTheme) {
      const themeDefaults = getGlobalThemeDefaults(activeTheme, element.textType || element.type || 'text', undefined);
      fontFamily = themeDefaults?.font?.fontFamily || themeDefaults?.fontFamily;
    }
  }
  
  if (!fontFamily) fontFamily = "Arial, sans-serif";
  
  let currentFontName = "Arial";
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => 
      f.family === fontFamily || 
      f.bold === fontFamily || 
      f.italic === fontFamily
    );
    if (font) {
      currentFontName = font.name;
      break;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 p-2">
        {FONT_GROUPS.map((group, groupIndex) => (
          <div key={group.name}>
            {groupIndex > 0 && <Separator />}
            <Label variant="xs" className="text-muted-foreground mb-2 block">
              {group.name}
            </Label>
            <div className="space-y-1">
              {group.fonts.map((font) => {
                const fontFamily = getFontFamily(font.name, isBold, isItalic);
                const isSelected = currentFontName === font.name;
                
                return (
                  <Tooltip key={font.name} content={font.name} side="left">
                    <Button
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
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="sticky bottom-0 bg-background border-t">
        <div className="p-2 border-b">
          <Label variant="xs" className="text-muted-foreground mb-1 block">
            Selected Font
          </Label>
          <div className="text-sm font-medium" style={{ fontFamily: getFontFamily(currentFontName, isBold, isItalic) }}>
            {currentFontName}
          </div>
        </div>
        <div className="p-2">
          <Button
            variant="outline"
            size="xs"
            onClick={onBack}
            className="w-full"
          >
            <ChevronLeft className="h-3 w-3 mr-1" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}