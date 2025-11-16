import { Star, Info, ChevronRight } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import type { WizardState } from './types';

const stepConfig = [
  { id: 'basic', label: 'Basic Info & Start', description: 'Name, size, and quick presets' },
  { id: 'design', label: 'Design', description: 'Layouts, toggles, themes & palettes' },
  { id: 'team', label: 'Team & Content', description: 'Collaborators and question pool', optional: true },
  { id: 'review', label: 'Review', description: 'Double-check and create' },
] as const;

interface ReviewStepProps {
  wizardState: WizardState;
  onEdit: (id: typeof stepConfig[number]['id']) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function ReviewSection({
  title,
  description,
  onEdit,
  optional,
}: {
  title: string;
  description: string;
  onEdit: () => void;
  optional?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold flex items-center gap-2">
          {title}
          {optional && (
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

export function ReviewStep({
  wizardState,
  onEdit,
  onSubmit,
  isSubmitting,
}: ReviewStepProps) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Review & finalize</h2>
          <p className="text-sm text-muted-foreground">Make sure everything looks good before creating the book.</p>
        </div>
      </div>

      <ReviewSection
        title="Basics"
        description={`${wizardState.basic.name} • ${wizardState.basic.pageSize} • ${wizardState.basic.orientation}`}
        onEdit={() => onEdit('basic')}
      />
      <ReviewSection
        title="Design"
        description={`${wizardState.design.layoutTemplate?.name ?? 'Not selected'}, Theme ${wizardState.design.themeId}, Palette ${wizardState.design.paletteId}`}
        onEdit={() => onEdit('design')}
      />
      <ReviewSection
        title="Team & Content"
        description={`${wizardState.team.selectedFriends.length} collaborators • ${wizardState.questions.selectedDefaults.length + wizardState.questions.custom.length} questions`}
        onEdit={() => onEdit('team')}
        optional
      />

      <div className="rounded-xl border border-dashed p-4 flex items-center gap-3 bg-muted/40 text-sm text-muted-foreground">
        <Info className="h-4 w-4 text-primary" />
        You can still invite more friends or tweak questions later inside the editor.
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating book...' : 'Create book and open editor'}
      </Button>
    </div>
  );
}

