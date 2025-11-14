type LayoutStrategy = 'same' | 'pair' | 'mirrored' | 'random';
type RandomMode = 'single' | 'pair';

interface LayoutVariationStepProps {
  layoutStrategy: LayoutStrategy;
  randomMode: RandomMode;
  onStrategyChange: (strategy: LayoutStrategy) => void;
  onRandomModeChange: (mode: RandomMode) => void;
}

const STRATEGY_OPTIONS: Array<{
  value: LayoutStrategy;
  title: string;
  description: string;
}> = [
  {
    value: 'same',
    title: 'Identical Pages',
    description: 'Apply the same layout to both sides of every spread.'
  },
  {
    value: 'pair',
    title: 'Pick Left & Right',
    description: 'Choose a dedicated layout for the left page and another for the right page.'
  },
  {
    value: 'mirrored',
    title: 'Mirror Right Page',
    description: 'Design the left page once and the assistant mirrors it for the right page.'
  },
  {
    value: 'random',
    title: 'Smart Shuffle',
    description: 'Let the assistant rotate through different layouts automatically.'
  }
];

export function LayoutVariationStep({
  layoutStrategy,
  randomMode,
  onStrategyChange,
  onRandomModeChange
}: LayoutVariationStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Layout Variation</h3>
        <p className="text-sm text-gray-600">Tell the assistant how it should distribute layouts across the book.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {STRATEGY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onStrategyChange(option.value)}
            className={`w-full text-left border rounded-xl p-4 transition-all ${
              layoutStrategy === option.value ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold">{option.title}</div>
            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
            {option.value === 'random' && layoutStrategy === 'random' && (
              <div className="mt-3 flex gap-2">
                <label className="flex items-center space-x-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="random-mode"
                    value="single"
                    checked={randomMode === 'single'}
                    onChange={() => onRandomModeChange('single')}
                  />
                  <span>Shuffle each page</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="random-mode"
                    value="pair"
                    checked={randomMode === 'pair'}
                    onChange={() => onRandomModeChange('pair')}
                  />
                  <span>Shuffle per spread</span>
                </label>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

