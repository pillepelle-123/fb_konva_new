import { useMemo, useState } from 'react';
import { MessageCircleQuestionMark } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../../../context/auth-context';

import { Badge } from '../../../ui/composites/badge';
import { Dialog, DialogContent } from '../../../ui/overlays/dialog';
import { QuestionsManagerContent } from '../../editor/questions-manager-content';
import QuestionPoolModal from '../../questions/question-pool-modal';
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
  openCustomQuestionModal: _openCustomQuestionModal, // eslint-disable-line @typescript-eslint/no-unused-vars
}: QuestionsStepProps) {
  const { token } = useAuth();
  const orderedQuestions = useMemo(() => wizardState.questions.orderedQuestions || [], [wizardState.questions.orderedQuestions]);
  const selectedQuestionIds = wizardState.questions.selectedDefaults;
  const [showQuestionPool, setShowQuestionPool] = useState(false);

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

  const handleQuestionEdit = (questionId: string, newText: string) => {
    const updated = orderedQuestions.map(q => 
      q.id === questionId ? { ...q, text: newText } : q
    );
    onQuestionChange({ orderedQuestions: updated });
  };

  const handleQuestionDelete = (questionId: string) => {
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

  const handleQuestionsFromPool = (poolQuestions: Array<{ id: number; question_text: string }>) => {
    if (poolQuestions.length === 0) return;

    const currentCount = orderedQuestions.length;
    const remainingSlots = maxQuestions - currentCount;
    
    if (remainingSlots <= 0) {
      return; // No more slots available
    }

    // Limit the number of questions to add based on maxQuestions
    const questionsToAdd = poolQuestions.slice(0, remainingSlots);
    
    const newQuestions = questionsToAdd.map((poolQ, index) => ({
      id: uuidv4(),
      text: poolQ.question_text,
      type: 'custom' as const,
      questionPoolId: poolQ.id.toString(),
      position: orderedQuestions.length + index, // Set position based on current count + index
    }));

    const updatedOrderedQuestions = [...orderedQuestions, ...newQuestions];
    const updatedCustom = [
      ...wizardState.questions.custom,
      ...newQuestions.map(q => ({ id: q.id, text: q.text }))
    ];

    onQuestionChange({
      orderedQuestions: updatedOrderedQuestions,
      custom: updatedCustom,
    });

    setShowQuestionPool(false);
  };

  const handleNavigate = (view: string) => {
    if (view === 'pool') {
      setShowQuestionPool(true);
    }
  };

  // Get set of question pool IDs that are already added
  const alreadyAddedQuestionPoolIds = useMemo(() => {
    const ids = new Set<number>();
    orderedQuestions.forEach(q => {
      if (q.questionPoolId) {
        const poolId = parseInt(q.questionPoolId);
        if (!isNaN(poolId)) {
          ids.add(poolId);
        }
      }
    });
    return ids;
  }, [orderedQuestions]);

  // Calculate available slots
  const availableSlots = useMemo(() => {
    const currentCount = orderedQuestions.length;
    return maxQuestions - currentCount;
  }, [orderedQuestions.length, maxQuestions]);

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
        <QuestionsManagerContent
          bookId="temp_wizard"
          bookName=""
          token={token || ''}
          mode="wizard"
          maxQuestions={maxQuestions}
          orderedQuestions={orderedQuestions}
          curatedQuestions={curatedQuestions}
          selectedDefaults={selectedQuestionIds}
          onQuestionChange={onQuestionChange}
          onQuestionEdit={handleQuestionEdit}
          onQuestionDelete={handleQuestionDelete}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Question Pool Modal */}
      <Dialog open={showQuestionPool} onOpenChange={setShowQuestionPool}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <QuestionPoolModal
            bookId={0} // Not used in wizard mode, but required by the component
            onClose={() => setShowQuestionPool(false)}
            onQuestionsAdded={handleQuestionsFromPool}
            singleSelect={false} // Allow multi-select
            alreadyAddedQuestionPoolIds={alreadyAddedQuestionPoolIds}
            maxAvailableSlots={availableSlots}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


