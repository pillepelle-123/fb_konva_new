import type { PageTemplate } from '../../../../../types/template-types';
import { LayoutSelector } from '../../../editor/templates/layout-selector';
import { LayoutTemplatePreview } from '../../../editor/templates/layout-template-preview';
import { mirrorTemplate } from '../../../../../utils/layout-mirroring';
import { StepGrid } from '../../shared/step-grid';
import { StepContainer } from '../../shared/step-container';

interface AssistedLayoutStepProps {
  strategy: 'same' | 'pair' | 'mirrored';
  layouts: {
    single: PageTemplate | null;
    left: PageTemplate | null;
    right: PageTemplate | null;
  };
  onSelectSingle: (template: PageTemplate) => void;
  onSelectLeft: (template: PageTemplate) => void;
  onSelectRight: (template: PageTemplate) => void;
}

export function AssistedLayoutStep({
  strategy,
  layouts,
  onSelectSingle,
  onSelectLeft,
  onSelectRight
}: AssistedLayoutStepProps) {
  if (strategy === 'pair') {
    return (
      <StepGrid columns={[1, 1, [2, 2, 1]]} gap="lg">
        <StepContainer variant="default" padding="md">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Left Page</h3>
            <p className="text-sm text-gray-600">Pick the base layout for the left side of the spread.</p>
            <LayoutSelector selectedLayout={layouts.left} onLayoutSelect={onSelectLeft} previewPosition="bottom" />
          </div>
        </StepContainer>
        <StepContainer variant="default" padding="md">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">Right Page</h3>
            <p className="text-sm text-gray-600">Choose a complementary layout for the right page.</p>
            <LayoutSelector selectedLayout={layouts.right} onLayoutSelect={onSelectRight} previewPosition="bottom" />
          </div>
        </StepContainer>
        <StepContainer variant="muted" padding="sm">
          <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Preview</div>
          {layouts.left ? (
            <LayoutTemplatePreview template={layouts.left} className="bg-white" showLegend={false} showItemLabels={false} />
          ) : (
            <p className="text-sm text-gray-500">Select a layout for the left page to preview.</p>
          )}
          {layouts.right ? (
            <LayoutTemplatePreview template={layouts.right} className="bg-white" showLegend={false} showItemLabels={false} />
          ) : (
            <p className="text-sm text-gray-500">Select a layout for the right page to preview.</p>
          )}
          </div>
        </StepContainer>
      </StepGrid>
    );
  }

  const title = strategy === 'mirrored' ? 'Choose a layout for the left page' : 'Choose the spread layout';
  const description =
    strategy === 'mirrored'
      ? 'The assistant will mirror this layout on the right page.'
      : 'The selected layout will be applied to both pages.';

  return (
    <StepGrid columns={[1, [2, 1]]} gap="lg">
      <StepContainer variant="default" padding="md">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          <LayoutSelector selectedLayout={layouts.single} onLayoutSelect={onSelectSingle} previewPosition="bottom" />
        </div>
      </StepContainer>
      <StepContainer variant="muted" padding="sm">
        <div className="space-y-3">
        <div className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Preview</div>
        {layouts.single ? (
          <>
            <LayoutTemplatePreview template={layouts.single} className="bg-white" showLegend={false} showItemLabels={false} />
            <div className="text-xs text-gray-500 text-center uppercase tracking-wide">Left Page</div>
            <LayoutTemplatePreview
              template={strategy === 'mirrored' ? mirrorTemplate(layouts.single) : layouts.single}
              className="bg-white"
              showLegend={false}
              showItemLabels={false}
            />
            <div className="text-xs text-gray-500 text-center uppercase tracking-wide">
              {strategy === 'mirrored' ? 'Mirrored Right Page' : 'Right Page'}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a layout to preview the spread.</p>
        )}
        </div>
      </StepContainer>
    </StepGrid>
  );
}

