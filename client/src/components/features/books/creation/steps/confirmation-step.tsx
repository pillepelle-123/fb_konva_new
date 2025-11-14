import { getGlobalTheme } from '../../../../../utils/global-themes';
import type { ColorPalette, PageTemplate } from '../../../../../types/template-types';

interface ConfirmationStepProps {
  name: string;
  pageSize: string;
  orientation: string;
  selectedTemplate: PageTemplate | null;
  selectedTheme: string;
  selectedPalette: ColorPalette | null;
}

export function ConfirmationStep({
  name,
  pageSize,
  orientation,
  selectedTemplate,
  selectedTheme,
  selectedPalette
}: ConfirmationStepProps) {
  const themeName = getGlobalTheme(selectedTheme)?.name ?? selectedTheme;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Confirmation</h3>
      <p className="text-sm text-gray-600">Review your selections and create your book.</p>

      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <div>
          <span className="font-medium">Book Name:</span> {name}
        </div>
        <div>
          <span className="font-medium">Format:</span> {pageSize} {orientation}
        </div>
        <div>
          <span className="font-medium">Layout:</span> {selectedTemplate?.name || 'Simple Layout'}
        </div>
        <div>
          <span className="font-medium">Theme:</span> {themeName}
        </div>
        <div>
          <span className="font-medium">Colors:</span> {selectedPalette?.name || 'Default'}
        </div>
      </div>
    </div>
  );
}

