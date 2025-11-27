import { useMemo, useState, useEffect, useCallback } from 'react';
import { MessageCircleQuestionMark, Plus, Library, ArrowBigLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import { Badge } from '../../../ui/composites/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../ui/overlays/dialog';
import { QuestionList, type Question } from '../../questions/question-list';
import { Button } from '../../../ui/primitives/button';
import { StepContainer } from '../shared/step-container';
import { Input } from '../../../ui/primitives/input';
import { apiService } from '../../../../services/api';
import type { WizardState } from './types';

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
  const orderedQuestions = useMemo(() => wizardState.questions.orderedQuestions || [], [wizardState.questions.orderedQuestions]);
  const selectedQuestionIds = wizardState.questions.selectedDefaults;
  const [showQuestionPool, setShowQuestionPool] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Pool mode state
  const [poolQuestions, setPoolQuestions] = useState<Question[]>([]);
  const [filteredPoolQuestions, setFilteredPoolQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoolIds, setSelectedPoolIds] = useState<Set<string | number>>(new Set());
  const [poolLoading, setPoolLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [questionPendingDelete, setQuestionPendingDelete] = useState<{ id: string; text: string } | null>(null);

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
  const handleEditButtonClick = (question: Question) => {
    setEditingQuestionId(question.id);
    setEditText(question.question_text);
  };

  const handleDeleteButtonClick = (question: Question) => {
    setQuestionPendingDelete({ id: question.id, text: question.question_text });
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

  // Pool mode functions
  const loadPoolQuestions = useCallback(async () => {
    try {
      setPoolLoading(true);
      const data = await apiService.getQuestionPool();
      const poolQuestionsConverted: Question[] = data.map((q: { id: number; question_text: string; category: string | null }) => ({
        id: q.id.toString(),
        question_text: q.question_text,
        created_at: new Date().toISOString(),
        updated_at: null,
        question_pool_id: q.id,
        category: q.category,
      }));
      setPoolQuestions(poolQuestionsConverted);
      setFilteredPoolQuestions(poolQuestionsConverted);
    } catch (error) {
      console.error('Error loading question pool:', error);
    } finally {
      setPoolLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.getQuestionPoolCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  // Load pool questions on mount for desktop view
  useEffect(() => {
    loadPoolQuestions();
    loadCategories();
  }, [loadPoolQuestions, loadCategories]);

  // Also reload when opening mobile dialog
  useEffect(() => {
    if (showQuestionPool) {
      loadPoolQuestions();
      loadCategories();
    }
  }, [showQuestionPool, loadPoolQuestions, loadCategories]);

  useEffect(() => {
    let filtered = poolQuestions;

    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.question_text.toLowerCase().includes(term));
    }

    setFilteredPoolQuestions(filtered);
  }, [poolQuestions, selectedCategory, searchTerm]);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    
    const currentCount = orderedQuestions.length;
    if (maxQuestions !== undefined && currentCount >= maxQuestions) {
      return;
    }
    
    const newQuestionObj = {
      id: uuidv4(),
      text: newQuestion,
      type: 'custom' as const,
      questionPoolId: null,
      position: currentCount,
    };
    
    const updatedOrderedQuestions = [...orderedQuestions, newQuestionObj];
    const updatedCustom = [...wizardState.questions.custom, { id: newQuestionObj.id, text: newQuestion }];
    
    onQuestionChange({
      orderedQuestions: updatedOrderedQuestions,
      custom: updatedCustom
    });
    
    setNewQuestion('');
  };


  const handleSaveEdit = (questionId: string) => {
    if (!editText.trim()) return;
    handleQuestionEdit(questionId, editText);
    setEditingQuestionId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditText('');
  };

  const handleAddFromPool = async () => {
    if (selectedPoolIds.size === 0) return;

    setAdding(true);
    try {
      const currentCount = orderedQuestions.length;
      const remainingSlots = maxQuestions - currentCount;
      
      if (remainingSlots <= 0) {
        return;
      }

      const selectedQuestions = filteredPoolQuestions.filter(q => selectedPoolIds.has(q.id));
      const questionsToAdd = selectedQuestions.slice(0, remainingSlots);
      
      const newQuestions = questionsToAdd.map((poolQ, index) => ({
        id: uuidv4(),
        text: poolQ.question_text,
        type: 'custom' as const,
        questionPoolId: poolQ.question_pool_id?.toString() || null,
        position: currentCount + index,
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
      setSelectedPoolIds(new Set());
    } catch (error) {
      console.error('Error adding questions from pool:', error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <StepContainer variant="default" padding="lg" className="rounded-xl shadow-sm flex flex-col h-full">
      {/* Mobile: Single column layout */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0">
          <MessageCircleQuestionMark className="h-5 w-5" />
          Question set
          <Badge variant="outline" className="text-[10px]">Optional</Badge>
          {maxQuestions > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Max {maxQuestions} questions
            </Badge>
          )}
        </div>
        {/* <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            
          </CardContent>
        </Card> */}
        <form onSubmit={handleAddQuestion} className="space-y-3">
              <div className="flex gap-2 p-1">
                <Input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter new question..."
                  className="flex-1"
                  disabled={maxQuestions !== undefined && orderedQuestions.length >= maxQuestions}
                />
                <Button 
                  type="submit" 
                  className="space-x-2"
                  disabled={maxQuestions !== undefined && orderedQuestions.length >= maxQuestions}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowQuestionPool(true)}
                  className="space-x-2"
                  disabled={maxQuestions !== undefined && orderedQuestions.length >= maxQuestions}
                >
                  <Library className="h-4 w-4" />
                  <span>Browse Pool</span>
                </Button>
              </div>
            </form>
        <QuestionList
          mode="sortable"
          questions={orderedQuestions.map((q, index) => ({
            id: q.id,
            question_text: q.text,
            created_at: new Date().toISOString(),
            updated_at: null,
            question_pool_id: q.questionPoolId ? parseInt(q.questionPoolId) : null,
            position: (q as { position?: number }).position ?? index,
            type: q.type,
          }))}
          orderedQuestions={orderedQuestions}
          onQuestionChange={onQuestionChange}
          onQuestionEdit={handleQuestionEdit}
          onQuestionDelete={handleQuestionDelete}
          editingQuestionId={editingQuestionId}
          editText={editText}
          onEditTextChange={setEditText}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          showEditDelete={true}
          onEditButtonClick={handleEditButtonClick}
          onDeleteButtonClick={handleDeleteButtonClick}
          maxQuestions={maxQuestions}
          emptyMessage="Add your first question above to get started."
        />
      </div>

      {/* Desktop: Two column layout */}
      <div className="hidden lg:flex flex-1 min-h-0 gap-6 overflow-hidden">
        {/* Left: Selected Questions */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0">
            <MessageCircleQuestionMark className="h-5 w-5" />
            Question set
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
            {maxQuestions > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                Max {maxQuestions} questions
              </Badge>
            )}
          </div>
          <form onSubmit={handleAddQuestion} className="space-y-3">
            <div className="flex gap-2 p-1">
              <Input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter new question..."
                className="flex-1"
                disabled={maxQuestions !== undefined && orderedQuestions.length >= maxQuestions}
              />
              <Button 
                type="submit" 
                className="space-x-2"
                disabled={maxQuestions !== undefined && orderedQuestions.length >= maxQuestions}
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </Button>
            </div>
          </form>
          <QuestionList
            mode="sortable"
            questions={orderedQuestions.map((q, index) => ({
              id: q.id,
              question_text: q.text,
              created_at: new Date().toISOString(),
              updated_at: null,
              question_pool_id: q.questionPoolId ? parseInt(q.questionPoolId) : null,
              position: (q as { position?: number }).position ?? index,
              type: q.type,
            }))}
            orderedQuestions={orderedQuestions}
            onQuestionChange={onQuestionChange}
            onQuestionEdit={handleQuestionEdit}
            onQuestionDelete={handleQuestionDelete}
            editingQuestionId={editingQuestionId}
            editText={editText}
            onEditTextChange={setEditText}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            showEditDelete={true}
            onEditButtonClick={handleEditButtonClick}
            onDeleteButtonClick={handleDeleteButtonClick}
            maxQuestions={maxQuestions}
            emptyMessage="Add your first question above to get started."
          />
        </div>

        {/* Right: Pool Questions */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-l pl-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="flex items-center gap-2 text-sm font-semibold flex-shrink-0">Pool Questions</span>
            </div>
            {selectedPoolIds.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleAddFromPool}
                disabled={adding || (availableSlots !== undefined && selectedPoolIds.size > availableSlots)}
                className="gap-2"
              >
                <ArrowBigLeft className="h-4 w-4" />
                <span>Add {selectedPoolIds.size}</span>
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <QuestionList
              mode="pool"
              questions={filteredPoolQuestions}
              loading={poolLoading}
              multiSelect={true}
              selectedIds={selectedPoolIds}
              onSelectionChange={setSelectedPoolIds}
              showCategory={true}
              compact={true}
              disabledQuestionIds={new Set(Array.from(alreadyAddedQuestionPoolIds).map(id => id.toString()))}
              maxAvailableSlots={availableSlots}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              emptyMessage="No questions found"
            />
          </div>
        </div>
      </div>

      {/* Question Pool Modal (Mobile only) */}
      <Dialog open={showQuestionPool} onOpenChange={setShowQuestionPool}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <QuestionList
            mode="pool"
            questions={filteredPoolQuestions}
            loading={poolLoading}
            multiSelect={true}
            selectedIds={selectedPoolIds}
            onSelectionChange={setSelectedPoolIds}
            showCategory={true}
            compact={true}
            disabledQuestionIds={new Set(Array.from(alreadyAddedQuestionPoolIds).map(id => id.toString()))}
            maxAvailableSlots={availableSlots}
            onAddSelected={handleAddFromPool}
            adding={adding}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categories}
            onNavigate={() => setShowQuestionPool(false)}
            emptyMessage="No questions found"
          />
        </DialogContent>
      </Dialog>
      <Dialog open={!!questionPendingDelete} onOpenChange={(open) => !open && setQuestionPendingDelete(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete “{questionPendingDelete?.text}”? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (questionPendingDelete) {
                  handleQuestionDelete(questionPendingDelete.id);
                }
                setQuestionPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StepContainer>
  );
}


