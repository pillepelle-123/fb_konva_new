import type { PageTemplate } from '../../../../../types/template-types';
import { LayoutSelector } from '../../../editor/templates/layout-selector';

interface LayoutPickerStepProps {
  title: string;
  description: string;
  selectedLayout: PageTemplate | null;
  onSelect: (template: PageTemplate) => void;
}

export function LayoutPickerStep({ title, description, selectedLayout, onSelect }: LayoutPickerStepProps) {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4 shrink-0">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <LayoutSelector selectedLayout={selectedLayout} onLayoutSelect={onSelect} previewPosition="right" />
      </div>
    </div>
  );
}

