import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../../ui/overlays/modal';
import { Button } from '../../ui/primitives/button';
import { Tooltip } from '../../ui/composites/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/composites/tabs';
import { QuestionSelectorContent, type PendingQuestionSelection } from './question-selector-content';
import { useEditor } from '../../../context/editor-context';
import { useAuth } from '../../../context/auth-context';
import { v4 as uuidv4 } from 'uuid';

interface Qna2EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionSelect: (questionId: string, questionText: string, questionPosition?: number, elementId?: string) => void;
  elementId: string | null;
  canShowQuestionTab: boolean;
  canShowAnswerTab: boolean;
}

export function Qna2EditorModal({
  isOpen,
  onClose,
  onQuestionSelect,
  elementId,
  canShowQuestionTab,
  canShowAnswerTab,
}: Qna2EditorModalProps) {
  const { state, dispatch, getQuestionText } = useEditor();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('question');
  const [pendingQuestionSelection, setPendingQuestionSelection] = useState<PendingQuestionSelection | null>(null);
  const [answerText, setAnswerText] = useState('');

  const element = useMemo(() => {
    if (!elementId || !state.currentBook) return null;
    for (const page of state.currentBook.pages) {
      const el = page.elements?.find(e => e.id === elementId);
      if (el) return el;
    }
    return null;
  }, [elementId, state.currentBook]);

  const elementPageNumber = useMemo(() => {
    if (!elementId || !state.currentBook) return null;
    for (const page of state.currentBook.pages) {
      if (page.elements?.some(el => el.id === elementId)) {
        return page.pageNumber ?? null;
      }
    }
    return null;
  }, [elementId, state.currentBook]);

  const assignedUser = elementPageNumber !== null
    ? state.pageAssignments[elementPageNumber] ?? null
    : null;

  // Effektive Frage: pending (noch nicht gespeichert) oder bereits am Element
  const effectiveQuestionId = pendingQuestionSelection?.questionId ?? element?.questionId;

  const currentAnswerTextForQuestion = useCallback(
    (questionId: string | undefined) => {
      if (!questionId || !assignedUser) return '';
      const entry = state.tempAnswers[questionId]?.[assignedUser.id];
      if (!entry) return '';
      return typeof entry === 'object' && entry !== null && 'text' in entry
        ? (entry as { text?: string }).text ?? ''
        : '';
    },
    [assignedUser, state.tempAnswers]
  );

  const answerIdForQuestion = useCallback(
    (questionId: string | undefined) => {
      if (!questionId || !assignedUser) return undefined;
      const entry = state.tempAnswers[questionId]?.[assignedUser.id];
      if (!entry || typeof entry !== 'object') return undefined;
      return (entry as { answerId?: string }).answerId;
    },
    [assignedUser, state.tempAnswers]
  );

  const currentAnswerText = currentAnswerTextForQuestion(effectiveQuestionId);

  // Beim Wechsel der Frage (pending oder element) Answer-Textarea synchronisieren
  useEffect(() => {
    setAnswerText(currentAnswerText);
  }, [effectiveQuestionId, currentAnswerText]);

  useEffect(() => {
    if (isOpen) {
      setPendingQuestionSelection(null);
      setAnswerText(currentAnswerTextForQuestion(element?.questionId));
      setActiveTab(canShowQuestionTab ? 'question' : 'answer');
    }
  }, [isOpen, canShowQuestionTab, element?.questionId, currentAnswerTextForQuestion]);

  const handleDiscard = useCallback(() => {
    setPendingQuestionSelection(null);
    setAnswerText(currentAnswerTextForQuestion(element?.questionId));
    onClose();
  }, [element?.questionId, currentAnswerTextForQuestion, onClose]);

  const handleRemoveQuestion = useCallback(() => {
    if (!elementId || !canShowQuestionTab) return;
    onQuestionSelect('', '', undefined, elementId);
    setPendingQuestionSelection(null);
    onClose();
  }, [elementId, canShowQuestionTab, onQuestionSelect, onClose]);

  const handleSaveAndClose = useCallback(() => {
    if (!elementId) {
      onClose();
      return;
    }

    // 1. Frage-Änderung anwenden (wenn canShowQuestionTab und pendingSelection)
    if (canShowQuestionTab && pendingQuestionSelection) {
      onQuestionSelect(
        pendingQuestionSelection.questionId,
        pendingQuestionSelection.questionText,
        pendingQuestionSelection.questionPosition,
        elementId
      );
    }

    // 2. Antwort-Änderung anwenden (wenn canShowAnswerTab und assignedUser)
    const questionIdToUse = pendingQuestionSelection?.questionId ?? element?.questionId;
    if (canShowAnswerTab && questionIdToUse && user?.id && assignedUser) {
      const aid = answerIdForQuestion(questionIdToUse) ?? uuidv4();
      dispatch({
        type: 'UPDATE_TEMP_ANSWER',
        payload: {
          questionId: questionIdToUse,
          text: answerText,
          userId: user.id,
          answerId: aid,
        },
      });
      dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Update QnA2 Answer' });
    }

    setPendingQuestionSelection(null);
    onClose();
  }, [
    elementId,
    canShowQuestionTab,
    canShowAnswerTab,
    pendingQuestionSelection,
    element?.questionId,
    onQuestionSelect,
    user?.id,
    assignedUser,
    answerText,
    answerIdForQuestion,
    dispatch,
    onClose,
  ]);

  const modalActions = useMemo(
    () => (
      <div className="flex flex-wrap gap-2 justify-end">
        {canShowQuestionTab && effectiveQuestionId && (
          <Tooltip content="Remove question from this textbox">
            <Button
              variant="outline"
              onClick={handleRemoveQuestion}
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </Tooltip>
        )}
        <Button variant="outline" onClick={handleDiscard}>
          Discard
        </Button>
        <Button onClick={handleSaveAndClose}>
          Save and Close
        </Button>
      </div>
    ),
    [canShowQuestionTab, effectiveQuestionId, handleRemoveQuestion, handleDiscard, handleSaveAndClose]
  );

  if (!elementId) return null;

  const tabCount = [canShowQuestionTab, canShowAnswerTab].filter(Boolean).length;
  if (tabCount === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Question & Answer"
      size="lg"
      closeOnBackdrop={false}
      actions={modalActions}
    >
      <div className="overflow-hidden flex-1 pr-2 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          {tabCount === 2 && (
            <TabsList className="grid w-full grid-cols-2" variant="bootstrap">
              <TabsTrigger value="question" variant="bootstrap">
                Question
              </TabsTrigger>
              <TabsTrigger value="answer" variant="bootstrap">
                Answer
              </TabsTrigger>
            </TabsList>
          )}

          {canShowQuestionTab && (
            <TabsContent value="question" className="flex-1 flex flex-col min-h-0 mt-2">
              <QuestionSelectorContent
                elementId={elementId}
                onQuestionSelect={onQuestionSelect}
                onClose={onClose}
                pendingQuestionSelection={pendingQuestionSelection}
                onPendingQuestionChange={setPendingQuestionSelection}
                hideActions={true}
                embedded={true}
              />
            </TabsContent>
          )}

          {canShowAnswerTab && (
            <TabsContent value="answer" className="flex-1 flex flex-col min-h-0 mt-2">
              <div className="flex-1 flex flex-col min-h-0 p-1">
                {effectiveQuestionId && (
                  <p className="text-sm font-medium text-muted-foreground mb-2 truncate">
                    {getQuestionText(effectiveQuestionId) || 'Answer'}
                  </p>
                )}
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Enter your answer..."
                  className="flex-1 min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Modal>
  );
}
