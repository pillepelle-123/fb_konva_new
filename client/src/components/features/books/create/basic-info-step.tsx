import { useState } from 'react';
import { ArrowBigRight, BookHeart, Sparkles } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { FormField } from '../../../ui/layout/form-field';
import { BOOK_ORIENTATIONS, BOOK_PAGE_DIMENSIONS, type BookOrientation, type BookPageSize } from '../../../../constants/book-formats';
import type { WizardState } from './types';

interface BasicInfoStepProps {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['basic']>) => void;
  onBookWizard: () => void;
  onBlankCanvas: () => void;
  isSubmitting: boolean;
}

// Helper function to render page representation
const PageRepresentation = ({
  pageSize,
  orientation,
  isSelected,
}: {
  pageSize: BookPageSize;
  orientation: BookOrientation;
  isSelected: boolean;
}) => {
  // Calculate aspect ratios
  // A4: 21cm x 29.7cm (portrait) or 29.7cm x 21cm (landscape)
  // A5: 14.8cm x 21cm (portrait) or 21cm x 14.8cm (landscape)
  // Square: 21cm x 21cm
  
  let width: number, height: number;
  const baseSize = 40; // Base size in pixels
  
  if (pageSize === 'Square') {
    width = baseSize;
    height = baseSize;
  } else if (pageSize === 'A4') {
    if (orientation === 'portrait') {
      width = baseSize;
      height = baseSize * (29.7 / 21);
    } else {
      width = baseSize * (29.7 / 21);
      height = baseSize;
    }
  } else { // A5
    if (orientation === 'portrait') {
      width = baseSize * (14.8 / 21);
      height = baseSize;
    } else {
      width = baseSize;
      height = baseSize * (14.8 / 21);
    }
  }
  
  return (
    <div
      className={`bg-white rounded-md flex-shrink-0 transition-all ${
        isSelected ? 'border-2 border-primary' : 'border border-border bg-[hsl(var(--primary-foreground))]'
      }`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '4px',
      }}
      title={`${pageSize} ${pageSize !== 'Square' ? orientation : ''}`.trim()}
    />
  );
};

export function BasicInfoStep({
  wizardState,
  onChange,
  onBookWizard,
  onBlankCanvas,
  isSubmitting,
}: BasicInfoStepProps) {
  const [hoveredButton, setHoveredButton] = useState<'wizard' | 'templates' | 'blank' | null>(null);
  const hasBookName = wizardState.basic.name.trim().length >= 3;
  
  const pageSizes = Object.keys(BOOK_PAGE_DIMENSIONS) as BookPageSize[];

  type PagePreviewCombination = { pageSize: BookPageSize; orientation: BookOrientation };
  const combinations: PagePreviewCombination[] = pageSizes.flatMap((size) => {
    if (size === 'Square') {
      return [{ pageSize: size, orientation: 'portrait' as BookOrientation }];
    }
    return BOOK_ORIENTATIONS.map<PagePreviewCombination>((orientation) => ({
      pageSize: size,
      orientation,
    }));
  });
  
  const currentCombination = {
    pageSize: wizardState.basic.pageSize,
    orientation: wizardState.basic.pageSize === 'Square' ? 'portrait' : wizardState.basic.orientation,
  };

  const buttonDescriptions: Record<'wizard' | 'templates' | 'blank', string> = {
    wizard: 'Continue through the wizard to customize your book to your needs.',
    templates: '"Ready for use" templates that help you get started quickly.',
    blank: 'Skip the wizard, create a book with blank pages and start editing.',
  };

  const activeDescription = hoveredButton ? buttonDescriptions[hoveredButton] : 'Bewege den Mauszeiger über eine Option, um mehr zu erfahren.';

  return (
    <div className="flex flex-row gap-6 ">
      <div className="flex w-2/3 flex-col gap-4 rounded-2xl bg-white shadow-sm border p-4">
        <div className="flex flex-col gap-2">
            {/* <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Basic setup</h2>
            </div> */}
            <p className="text-sm">
              Name your book, select size & orientation, then choose how to start.
            </p>
        </div>
        <div className="flex flex-row gap-6">
          <div className="flex flex-col w-5/6">
            <div className="md:col-span-2">
              <FormField label="Book name">
                <input
                  className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-all ${
                    !hasBookName 
                      ? 'border-input animate-pulse-input' 
                      : 'border-input'
                  }`}
                  value={wizardState.basic.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="E.g. Class of 2025"
                />
              </FormField>
            </div>
            <div className="md:col-span-1">
              {/* Empty space for alignment */}
            </div>
            <div className="md:col-span-2">
              <FormField label="Page size">
                <div className="flex gap-2">
                {pageSizes.map((size) => (
                    <Button
                      key={size}
                      variant={wizardState.basic.pageSize === size ? 'default' : 'outline'}
                      className="flex-1"
                    onClick={() =>
                      onChange({
                        pageSize: size,
                        orientation:
                          size === 'Square'
                            ? 'portrait'
                            : wizardState.basic.orientation ?? BOOK_ORIENTATIONS[0],
                      })
                    }
                    >
                    {size === 'Square' ? 'Square (21×21cm)' : size}
                    </Button>
                  ))}
                </div>
              </FormField>
            </div>
            <div className="md:col-span-1">
              {/* Visual representations will be shown here */}
            </div>
            <div className="md:col-span-2">
              <FormField label="Orientation">
                <div className="flex gap-2">
                {BOOK_ORIENTATIONS.map((option) => (
                    <Button
                      key={option}
                      variant={wizardState.basic.orientation === option ? 'default' : 'outline'}
                      className="flex-1"
                    onClick={() => onChange({ orientation: option })}
                      disabled={wizardState.basic.pageSize === 'Square'}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Button>
                  ))}
                </div>
              </FormField>
            </div>

          </div>
          <div className="flex flex-col gap-3 pt-16 w-1/6 items-end">
            {/* <div className="text-xs text-muted-foreground font-medium mb-1">Preview</div> */}
            <div className="flex flex-col gap-2 items-end">
              {combinations.map((combo, idx) => (
                <PageRepresentation
                  key={idx}
                  pageSize={combo.pageSize}
                  orientation={combo.orientation}
                  isSelected={
                    currentCombination.pageSize === combo.pageSize &&
                    (combo.pageSize === 'Square' || currentCombination.orientation === combo.orientation)
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center pb-10">
        <button
          type="button"
          className={`z-10 inline-flex h-12 w-12 items-center justify-center rounded-full transition hover:bg-muted' : 'opacity-50 cursor-not-allowed border border-input bg-background text-foreground ${!hasBookName || isSubmitting ? 'opacity-50 cursor-not-allowed border border-input bg-background text-foreground' : ''}`}
          // aria-label={step.label}
          // title={step.label}
        >
          <ArrowBigRight className="h-6 w-6" />
        </button>
      </div>
      <div className="flex w-1/3 flex-col gap-3 min-w-0">
        <Button
            onClick={onBookWizard}
            disabled={!hasBookName || isSubmitting}
            variant="highlight"
            size="lg"
            className={`h-full p-4 flex flex-col items-start text-left whitespace-normal overflow-hidden ${hasBookName ? 'animate-pulse-button' : ''}`}
            onMouseEnter={() => setHoveredButton('wizard')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <div className="flex items-center gap-2 mb-1 w-full min-w-0">
              <Sparkles className="h-8 w-8 stroke-[4px] mr-2" />
              <p className="font-semibold text-base break-words w-full min-w-0" style={{ fontFamily: 'Gochi Hand', fontSize: '2rem', fontWeight: '300' }}>Start Book Wizard</p>
            </div>
          </Button>
          <Button
            // onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="primary"
            className="h-16 p-4 flex flex-col items-start text-left"
            onMouseEnter={() => setHoveredButton('templates')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <div className="flex items-center gap-2 mb-1 w-full min-w-0">
            <BookHeart className="h- w-6 mr-2" />
            <p className="font-semibold">Design Templates</p>
            </div>
          </Button>
          <Button
            onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="ghost_hover"
            className="h-16 p-4 flex flex-col items-start text-left"
            onMouseEnter={() => setHoveredButton('blank')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            <p className="font-semibold mb-1">Blank Canvas</p>
          </Button>
          <div className="relative mt-2">
            <div className="speech-bubble rounded-2xl h-32 border border-border bg-white p-4 text-sm shadow-sm">
              <span className={`text-sm text-muted-foreground/50 ${hoveredButton ? 'text-primary' : ''}`}>
                {activeDescription}
              </span>
            </div>
          </div>

      </div>

      {/* <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Continue</p>
        <div className="grid gap-4 md:grid-cols-3">
          <Button
            onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="outline"
            className="h-16 py-6 px-6 flex flex-col items-start text-left"
          >
            <p className="font-semibold mb-1">Blank Canvas</p>
            <p className="text-xs text-muted-foreground">Skip the wizard, create a book with blank pages and start editing</p>
          </Button>
          <Button
            // onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="outline"
            className="h-16 py-6 px-6 flex flex-col items-start text-left"
          >
            <p className="font-semibold mb-1">Design Templates</p>
            <p className="text-xs text-muted-foreground">"Ready for use" templates, that help you to get started quickly</p>
          </Button>
          <Button
            onClick={onBookWizard}
            disabled={!hasBookName || isSubmitting}
            variant="highlight"
            size="lg"
            className="h-auto py-6 px-6 flex flex-col items-start text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5" />
              <p className="font-semibold text-base">Start Book Wizard</p>
            </div>
            <p className="text-xs opacity-90">Continue through the wizard to customize your book</p>
          </Button>
        </div>
      </div> */}
      <style>{`
        @keyframes pulse-button {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 hsl(45 92% 42% / 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px hsl(45 92% 42% / 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 hsl(45 92% 42% / 0);
          }
        }
        
        .animate-pulse-button {
          animation: pulse-button 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-input {
          0% {
            box-shadow: 0 0 0 0 hsl(var(--muted-foreground) / 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px hsl(var(--muted-foreground) / 0);
          }
          100% {
            box-shadow: 0 0 0 0 hsl(var(--muted-foreground) / 0);
          }
        }

        .animate-pulse-input {
          animation: pulse-input 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .speech-bubble {
          position: relative;
        }

        .speech-bubble::after {
          content: "";
          position: absolute;
          width: 24px;
          height: 24px;
          top: -12px;
          left: 2rem;
          background: inherit;
          border: inherit;
          border-right: none;
          border-bottom: none;
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
}

