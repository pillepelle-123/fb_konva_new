import { useMemo } from 'react';
import { MessageCircleQuestionMark, Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import { SortableList } from '../../../ui/composites/sortable-list';
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
  const orderedQuestions = wizardState.questions.orderedQuestions || [];
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

  const handleAddQuestion = (questionId: string, type: 'curated' | 'custom', text: string) => {
    if (orderedQuestions.length >= maxQuestions) {
      toast.error(`Maximum of ${maxQuestions} questions reached.`);
      return;
    }

    // Curated questions don't have a question_pool_id (they're hardcoded, not from question_pool table)
    // Custom questions also don't have a question_pool_id
    const questionPoolId = null;
    const newQuestion = {
      id: uuidv4(), // Always use UUID for database compatibility
      text,
      type,
      questionPoolId,
      // Store the original curated question ID for reference
      ...(type === 'curated' && { curatedQuestionId: questionId }),
    };

    const updatedOrderedQuestions = [...orderedQuestions, newQuestion];
    const updatedSelectedDefaults = type === 'curated' 
      ? [...selectedQuestionIds, questionId]
      : selectedQuestionIds;
    const updatedCustom = type === 'custom'
      ? [...wizardState.questions.custom, { id: newQuestion.id, text }] // Use UUID from newQuestion
      : wizardState.questions.custom;

    onQuestionChange({
      orderedQuestions: updatedOrderedQuestions,
      selectedDefaults: updatedSelectedDefaults,
      custom: updatedCustom,
    });
  };

  const handleRemoveQuestion = (questionId: string) => {
    const question = orderedQuestions.find(q => q.id === questionId);
    if (!question) return;

    const updatedOrderedQuestions = orderedQuestions.filter(q => q.id !== questionId);
    const updatedSelectedDefaults = question.type === 'curated' && question.curatedQuestionId
      ? selectedQuestionIds.filter(id => id !== question.curatedQuestionId)
      : selectedQuestionIds;
    const updatedCustom = question.type === 'custom'
      ? wizardState.questions.custom.filter(q => q.id !== questionId)
      : wizardState.questions.custom;

    onQuestionChange({
      orderedQuestions: updatedOrderedQuestions,
      selectedDefaults: updatedSelectedDefaults,
      custom: updatedCustom,
    });
  };

  const handleSortEnd = (newOrderedQuestions: typeof orderedQuestions) => {
    onQuestionChange({ orderedQuestions: newOrderedQuestions });
  };

  const handleToggleQuestion = (questionId: string) => {
    const isInList = orderedQuestions.some(q => q.questionPoolId === questionId);
    
    if (isInList) {
      // Remove from list
      const question = orderedQuestions.find(q => q.questionPoolId === questionId);
      if (question) {
        handleRemoveQuestion(question.id);
      }
    } else {
      // Add to list
      const curatedQuestion = curatedQuestions.find(q => q.id === questionId);
      if (curatedQuestion) {
        handleAddQuestion(questionId, 'curated', curatedQuestion.text);
      }
    }
  };

  const isQuestionInList = (questionId: string) => {
    return orderedQuestions.some(q => q.questionPoolId === questionId);
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
                  checked={isQuestionInList(question.id)}
                  onChange={() => handleToggleQuestion(question.id)}
                  disabled={!isQuestionInList(question.id) && orderedQuestions.length >= maxQuestions}
                />
                <span className={!isQuestionInList(question.id) && orderedQuestions.length >= maxQuestions ? 'text-muted-foreground/50' : ''}>
                  {question.text}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 space-y-2 border-t pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openCustomQuestionModal}
            disabled={orderedQuestions.length >= maxQuestions}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add custom question
          </Button>
        </div>
        
        {/* SortableList of questions */}
        {orderedQuestions.length > 0 && (
          <div className="flex-shrink-0 border-t pt-3 mt-3">
            <p className="text-xs font-semibold mb-2">Selected questions</p>
            <SortableList
              items={orderedQuestions}
              onSortEnd={handleSortEnd}
              renderItem={(question) => (
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="text-sm flex-1">{question.text}</span>
                  <button
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    aria-label={`Remove ${question.text}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}


