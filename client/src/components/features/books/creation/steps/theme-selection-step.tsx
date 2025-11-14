import { ThemeSelector } from '../../../editor/templates/theme-selector';

interface ThemeSelectionStepProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}

export function ThemeSelectionStep({ selectedTheme, onSelect }: ThemeSelectionStepProps) {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold mb-2">Theme Selection</h3>
        <p className="text-sm text-gray-600">Choose the visual style for your book.</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <ThemeSelector selectedTheme={selectedTheme} onThemeSelect={onSelect} title="Book Theme" previewPosition="right" />
      </div>
    </div>
  );
}

