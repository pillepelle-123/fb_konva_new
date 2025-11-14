import type { ColorPalette } from '../../../../../types/template-types';
import { WizardPaletteSelector } from '../../../editor/templates/wizard-palette-selector';

interface PaletteSelectionStepProps {
  selectedPalette: ColorPalette | null;
  themeId: string;
  onSelect: (palette: ColorPalette) => void;
}

export function PaletteSelectionStep({ selectedPalette, themeId, onSelect }: PaletteSelectionStepProps) {
  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold mb-2">Color Palette</h3>
        <p className="text-sm text-gray-600">Choose the color scheme for your book.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <WizardPaletteSelector
          selectedPalette={selectedPalette}
          onPaletteSelect={onSelect}
          previewPosition="right"
          themeId={themeId}
        />
      </div>
    </div>
  );
}

