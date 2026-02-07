import { Type } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Separator } from '../../../ui';
import { FONT_GROUPS, getFontFamily } from '../../../../utils/font-families';
import { SelectorBase } from './selector-base';

interface FontSelectorProps {
  currentFont: string;
  isBold: boolean;
  isItalic: boolean;
  onFontSelect: (fontName: string) => void;
  onBack?: () => void;
}

export function FontSelector({ currentFont, isBold, isItalic, onFontSelect, onBack }: FontSelectorProps) {
  let currentFontName = "Arial";
  for (const group of FONT_GROUPS) {
    const font = group.fonts.find(f => f.family === currentFont || f.bold === currentFont || f.italic === currentFont);
    if (font) {
      currentFontName = font.name;
      break;
    }
  }

  const allFonts = FONT_GROUPS.flatMap(group => group.fonts);
  const selectedFont = allFonts.find(f => f.name === currentFontName) || allFonts[0];

  return (
    <div className="space-y-3">
      {FONT_GROUPS.map((group, groupIndex) => (
        <div key={group.name}>
          {groupIndex > 0 && <Separator />}
          <div className="text-xs text-muted-foreground mb-2 font-medium">{group.name}</div>
          <div className="space-y-1">
            {group.fonts.map((font) => {
              const fontFamily = getFontFamily(font.name, isBold, isItalic);
              const isSelected = currentFontName === font.name;
              
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
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
