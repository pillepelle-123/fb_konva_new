import { StepGrid } from '../../shared/step-grid';
import { StepContainer } from '../../shared/step-container';

type ModeValue = 'pre-designed' | 'assisted' | 'empty' | 'advanced' | null;

interface StartModeStepProps {
  mode: ModeValue;
  onSelect: (mode: ModeValue) => void;
}

export function StartModeStep({ mode, onSelect }: StartModeStepProps) {
  const optionClasses = (value: ModeValue, emphasize = false) =>
    `text-left transition-all ${
      mode === value
        ? 'border-blue-500 bg-blue-50 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 hover:shadow'
    } ${emphasize ? 'md:col-span-2 md:-mr-8 md:-ml-8' : ''}`;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Start Mode</h3>
      <p className="text-sm text-gray-600">Pick the workflow that matches how you want to build your book.</p>
      <StepGrid columns={[1, 3, 3]} gap="sm">
        <StepContainer 
          as="button" 
          variant="default" 
          padding="lg"
          className={optionClasses('pre-designed')}
          onClick={() => onSelect('pre-designed')}
        >
          <div className="font-medium">Pre-designed</div>
          <p className="text-sm text-gray-600 mt-1">
            Choose from complete layouts that combine spacing, typography, and colors. Tweak them later if needed.
          </p>
        </StepContainer>

        <StepContainer 
          as="button" 
          variant="default" 
          padding="lg"
          className={optionClasses('assisted', true)}
          onClick={() => onSelect('assisted')}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-lg">Smart Assistant</div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Our recommendation
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Let us suggest layout variations across spreads. Perfect if you want cohesive variety with minimal effort.
          </p>
        </StepContainer>

        <StepContainer 
          as="button" 
          variant="default" 
          padding="lg"
          className={optionClasses('empty')}
          onClick={() => onSelect('empty')}
        >
          <div className="font-medium">Design Yourself</div>
          <p className="text-sm text-gray-600 mt-1">
            Start with blank spreads and build everything from scratch. Your book uses the default theme to begin with.
          </p>
        </StepContainer>
      </StepGrid>
    </div>
  );
}

