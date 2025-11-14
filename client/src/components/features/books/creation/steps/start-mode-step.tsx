type ModeValue = 'pre-designed' | 'assisted' | 'empty' | 'advanced' | null;

interface StartModeStepProps {
  mode: ModeValue;
  onSelect: (mode: ModeValue) => void;
}

export function StartModeStep({ mode, onSelect }: StartModeStepProps) {
  const optionClasses = (value: ModeValue, emphasize = false) =>
    `p-5 border rounded-xl text-left transition-all ${
      mode === value
        ? 'border-blue-500 bg-blue-50 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 hover:shadow'
    } ${emphasize ? 'md:col-span-2 md:-mr-8 md:-ml-8' : ''}`;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Start Mode</h3>
      <p className="text-sm text-gray-600">Pick the workflow that matches how you want to build your book.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button type="button" onClick={() => onSelect('pre-designed')} className={optionClasses('pre-designed')}>
          <div className="font-medium">Pre-designed</div>
          <p className="text-sm text-gray-600 mt-1">
            Choose from complete layouts that combine spacing, typography, and colors. Tweak them later if needed.
          </p>
        </button>

        <button type="button" onClick={() => onSelect('assisted')} className={optionClasses('assisted', true)}>
          <div className="flex items-center justify-between">
            <div className="font-medium text-lg">Smart Assistant</div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Our recommendation
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Let us suggest layout variations across spreads. Perfect if you want cohesive variety with minimal effort.
          </p>
        </button>

        <button type="button" onClick={() => onSelect('empty')} className={optionClasses('empty')}>
          <div className="font-medium">Design Yourself</div>
          <p className="text-sm text-gray-600 mt-1">
            Start with blank spreads and build everything from scratch. Your book uses the default theme to begin with.
          </p>
        </button>
      </div>
    </div>
  );
}

