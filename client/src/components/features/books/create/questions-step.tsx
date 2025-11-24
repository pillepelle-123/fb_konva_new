import { useMemo } from 'react';
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

  // Calculate maximum number of questions that can be added
  const maxQuestions = useMemo(() => {
    // Get number of textboxes from layout template
    let textboxCountPerPage = 0;
    
    if (wizardState.design.pickLeftRight) {
      // If left/right templates are selected, we have different templates for left and right pages
      // Each spread has leftCount + rightCount textboxes total
      // But we need textboxes per page, so we average them: (leftCount + rightCount) / 2
      const leftCount = wizardState.design.leftLayoutTemplate?.textboxes?.length ?? 0;
      const rightCount = wizardState.design.rightLayoutTemplate?.textboxes?.length ?? 0;
      textboxCountPerPage = (leftCount + rightCount) / 2;
    } else {
      // Single layout template (mirrorLayout means same template on both sides)
      if (wizardState.design.layoutTemplate?.textboxes) {
        // For single template, each page has the same number of textboxes
        textboxCountPerPage = wizardState.design.layoutTemplate.textboxes.length;
      }
    }
    
    // Get pages per user from team step
    const pagesPerUser = wizardState.team.pagesPerUser;
    
    // Calculate: textboxes per page × pagesPerUser
    return Math.floor(textboxCountPerPage * pagesPerUser);
  }, [
    wizardState.design.layoutTemplate,
    wizardState.design.leftLayoutTemplate,
    wizardState.design.rightLayoutTemplate,
    wizardState.design.pickLeftRight,
    wizardState.team.pagesPerUser,
  ]);

  const handleToggleQuestion = (questionId: string) => {
    const nextSelection = selectedQuestionIds.includes(questionId)
      ? selectedQuestionIds.filter((id) => id !== questionId)
      : [...selectedQuestionIds, questionId];
    onQuestionChange({ selectedDefaults: nextSelection });
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0 mb-4">
        <MessageCircleQuestionMark className="h-5 w-5" />
        Question set
        <Badge variant="outline" className="text-[10px]">Optional</Badge>
        {maxQuestions > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            Max {maxQuestions} questions
          </Badge>
        )}
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


