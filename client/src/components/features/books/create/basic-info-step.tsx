import { Sparkles } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { FormField } from '../../../ui/layout/form-field';
import type { WizardState } from './types';

interface BasicInfoStepProps {
  wizardState: WizardState;
  onChange: (data: Partial<WizardState['basic']>) => void;
  onBookWizard: () => void;
  onBlankCanvas: () => void;
  isSubmitting: boolean;
}

export function BasicInfoStep({
  wizardState,
  onChange,
  onBookWizard,
  onBlankCanvas,
  isSubmitting,
}: BasicInfoStepProps) {
  const hasBookName = wizardState.basic.name.trim().length > 0;

  return (
    <div className="flex flex-row gap-4 ">
      <div className="w-2/3 rounded-2xl bg-white shadow-sm border p-4 space-y-8">
        <div>
          {/* <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Basic setup</h2>
          </div> */}
          <p className="text-sm">
            Name your book, select size & orientation, then choose how to start.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Book name">
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={wizardState.basic.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="E.g. Class of 2025"
            />
          </FormField>
          <FormField label="Orientation">
            <div className="flex gap-2">
              {['portrait', 'landscape'].map((option) => (
                <Button
                  key={option}
                  variant={wizardState.basic.orientation === option ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onChange({ orientation: option as WizardState['basic']['orientation'] })}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          </FormField>
          <FormField label="Page size">
            <div className="flex gap-2">
              {['A4', 'A5'].map((size) => (
                <Button
                  key={size}
                  variant={wizardState.basic.pageSize === size ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onChange({ pageSize: size as WizardState['basic']['pageSize'] })}
                >
                  {size}
                </Button>
              ))}
            </div>
          </FormField>
        </div>
      </div>
      <div className="w-1/3 flex flex-col gap-3 min-w-0">
      <Button
            onClick={onBookWizard}
            disabled={!hasBookName || isSubmitting}
            variant="highlight"
            size="lg"
            className="h-full p-4 flex flex-col items-start text-left whitespace-normal overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-1 w-full min-w-0">
              <Sparkles className="h-5 w-5 flex-shrink-0" />
              <p className="font-semibold text-base break-words w-full min-w-0">Start Book Wizard</p>
            </div>
            <p className="text-sm opacity-90 break-words w-full min-w-0" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>Continue through the wizard to customize your book to your needs</p>
          </Button>
          <Button
            onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="outline"
            className="h-16 p-4 flex flex-col items-start text-left"
          >
            <p className="font-semibold mb-1">Blank Canvas</p>
            <p className="text-xs text-muted-foreground">Skip the wizard, create a book with blank pages and start editing</p>
          </Button>
          <Button
            // onClick={onBlankCanvas}
            disabled={!hasBookName || isSubmitting}
            variant="outline"
            className="h-16 p-4 flex flex-col items-start text-left"
          >
            <p className="font-semibold mb-1">Design Templates</p>
            <p className="text-xs text-muted-foreground">"Ready for use" templates, that help you to get started quickly</p>
          </Button>

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
    </div>
  );
}

