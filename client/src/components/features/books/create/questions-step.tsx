import { MessageCircleQuestionMark, Plus } from 'lucide-react';

import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import {
  curatedQuestions,
  type WizardState,
} from './types';

interface QuestionsStepProps {
  wizardState: WizardState;
  onQuestionChange: (data: Partial<WizardState['questions']>) => void;
  openCustomQuestionModal: () => void;
}

export function QuestionsStep({
  wizardState,
  onQuestionChange,
  openCustomQuestionModal,
}: QuestionsStepProps) {
  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  const handleToggleQuestion = (questionId: string) => {
    const nextSelection = selectedQuestionIds.includes(questionId)
      ? selectedQuestionIds.filter((id) => id !== questionId)
      : [...selectedQuestionIds, questionId];
    onQuestionChange({ selectedDefaults: nextSelection });
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border p-5 flex flex-col min-h-[60vh]">
      <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0 mb-4">
        <MessageCircleQuestionMark className="h-5 w-5" />
        Question set
        <Badge variant="outline" className="text-[10px]">Optional</Badge>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <p className="text-sm text-muted-foreground flex-shrink-0 mb-3">
          Select from the curated prompts or add your own questions for collaborators.
        </p>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mb-3">
          <div className="space-y-2">
            {curatedQuestions.map((question) => (
              <label key={question.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedQuestionIds.includes(question.id)}
                  onChange={() => handleToggleQuestion(question.id)}
                />
                <span>{question.text}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 space-y-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={openCustomQuestionModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add custom question
          </Button>
          {wizardState.questions.custom.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Custom questions</p>
              <ul className="text-sm text-muted-foreground list-disc pl-4">
                {wizardState.questions.custom.map((question) => (
                  <li key={question.id}>{question.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


