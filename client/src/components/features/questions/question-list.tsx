import { type ReactNode, useState } from 'react';
import { Card, CardContent } from '../../ui/composites/card';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { Checkbox } from '../../ui/primitives/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../ui/primitives/select';
import { SortableList } from '../../ui/composites/sortable-list';
import { Badge } from '../../ui/composites/badge';
import { MessageCircleQuestionMark, Calendar, Edit, Trash2, Save, X, Users, Library, MessageSquare } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Common Question interface
export interface Question {
  id: string;
  question_text: string;
  created_at: string;
  updated_at: string | null;
  question_pool_id?: number | null;
  display_order?: number | null;
  answered_by_user?: boolean;
  isNew?: boolean;
  answers?: Answer[];
  category?: string | null;
  type?: 'curated' | 'custom';
  curatedQuestionId?: string;
  position?: number;
}

export interface Answer {
  id: string;
  user_id: number;
  answer_text: string;
  user_name: string;
  user_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionStats {
  question_id: string;
  answer_count: number;
  unique_users: number;
}

export type QuestionListMode = 'select' | 'edit' | 'view' | 'sortable' | 'pool';

export interface QuestionListProps {
  mode: QuestionListMode;
  questions: Question[];
  loading?: boolean;
  onQuestionSelect?: (questionId: string, questionText: string, questionPosition?: number) => void;
  onQuestionEdit?: (questionId: string, newText: string) => void;
  onQuestionDelete?: (questionId: string) => void;
  onSortEnd?: (reorderedQuestions: Question[]) => void;
  onQuestionOrderChange?: (questionOrders: Array<{ questionId: string; displayOrder: number }>) => void;
  multiSelect?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  showCategory?: boolean;
  showStats?: boolean;
  showAnswers?: boolean;
  showEditDelete?: boolean;
  showDates?: boolean;
  emptyMessage?: string;
  disabledQuestionIds?: Set<string | number>;
  maxAvailableSlots?: number;
  compact?: boolean;
  sortable?: boolean;
  editingQuestionId?: string | null;
  editText?: string;
  onEditTextChange?: (text: string) => void;
  onSaveEdit?: (questionId: string) => void;
  onCancelEdit?: () => void;
  renderCustomActions?: (question: Question) => ReactNode;
  onEditButtonClick?: (question: Question) => void;
  onDeleteButtonClick?: (question: Question) => void;
  validateQuestionSelection?: (questionId: string) => { valid: boolean; reason?: string };
  questionStats?: QuestionStats[];
  getUserAnswer?: (questionId: string) => { answer_text: string } | null;
  userRole?: 'owner' | 'publisher' | 'author';
  onViewAnswers?: (questionId: string, questionText: string) => void;
  highlightedQuestionId?: string;
  // For pool mode
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  categories?: string[];
  onAddSelected?: () => void;
  adding?: boolean;
  // For wizard mode
  orderedQuestions?: Array<{
    id: string;
    text: string;
    type: 'curated' | 'custom';
    questionPoolId?: string | null;
    curatedQuestionId?: string;
    position?: number;
  }>;
  onQuestionChange?: (data: {
    orderedQuestions: Array<{
      id: string;
      text: string;
      type: 'curated' | 'custom';
      questionPoolId?: string | null;
      curatedQuestionId?: string;
      position?: number;
    }>;
    selectedDefaults?: string[];
    custom?: Array<{ id: string; text: string }>;
  }) => void;
  maxQuestions?: number;
  onNavigate?: (view: string) => void;
}

export function QuestionList({
  mode,
  questions,
  loading = false,
  onQuestionSelect,
  onQuestionEdit,
  onQuestionDelete,
  onQuestionOrderChange,
  multiSelect = false,
  selectedIds = new Set(),
  onSelectionChange,
  showCategory = false,
  showStats = false,
  showAnswers = false,
  showEditDelete = false,
  showDates = true,
  emptyMessage,
  disabledQuestionIds = new Set(),
  maxAvailableSlots,
  compact = false,
  editingQuestionId,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  renderCustomActions,
  onEditButtonClick,
  onDeleteButtonClick,
  validateQuestionSelection,
  questionStats = [],
  getUserAnswer,
  userRole,
  onViewAnswers,
  searchTerm = '',
  onSearchChange,
  selectedCategory = '',
  onCategoryChange,
  categories = [],
  onAddSelected,
  adding = false,
  orderedQuestions,
  onQuestionChange,
  maxQuestions,
  onNavigate,
  highlightedQuestionId,
}: QuestionListProps) {
  const [localEditingId, setLocalEditingId] = useState<string | null>(null);
  const [localEditText, setLocalEditText] = useState('');

  // Use provided editing state or local state
  const isEditing = (questionId: string) => {
    if (editingQuestionId !== undefined) {
      return editingQuestionId === questionId;
    }
    return localEditingId === questionId;
  };

  const getEditText = () => {
    if (editText !== undefined) {
      return editText;
    }
    return localEditText;
  };

  const handleStartEdit = (question: Question) => {
    if (onEditTextChange) {
      onEditTextChange(question.question_text);
    } else {
      setLocalEditText(question.question_text);
    }
    if (editingQuestionId === undefined) {
      setLocalEditingId(question.id);
    }
  };

  const handleSaveEdit = (questionId: string) => {
    const text = getEditText();
    if (!text.trim()) return;

    if (onSaveEdit) {
      onSaveEdit(questionId);
    } else if (onQuestionEdit) {
      onQuestionEdit(questionId, text);
    }

    if (onCancelEdit) {
      onCancelEdit();
    } else {
      setLocalEditingId(null);
      setLocalEditText('');
    }
  };

  const handleCancelEdit = () => {
    if (onCancelEdit) {
      onCancelEdit();
    } else {
      setLocalEditingId(null);
      setLocalEditText('');
    }
  };

  const handleDelete = (questionId: string) => {
    if (onQuestionDelete) {
      onQuestionDelete(questionId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStat = (questionId: string) => {
    return questionStats.find(s => s.question_id === questionId);
  };

  const toggleSelection = (id: string | number) => {
    if (disabledQuestionIds.has(id)) {
      return;
    }

    if (maxAvailableSlots !== undefined && !selectedIds.has(id) && selectedIds.size >= maxAvailableSlots) {
      return;
    }

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange?.(newSelected);
  };

  const handleQuestionClick = (question: Question) => {
    if (disabledQuestionIds.has(question.id)) {
      return;
    }

    if (maxAvailableSlots !== undefined && !selectedIds.has(question.id) && selectedIds.size >= maxAvailableSlots) {
      return;
    }

    if (mode === 'select' && onQuestionSelect) {
      const position = question.display_order ?? question.position;
      onQuestionSelect(question.id, question.question_text, position !== undefined ? position : undefined);
    } else if (mode === 'pool' && multiSelect) {
      toggleSelection(question.id);
    } else if (mode === 'pool' && !multiSelect && onAddSelected) {
      // Single select in pool mode
      const newSelected = new Set([question.id]);
      onSelectionChange?.(newSelected);
      onAddSelected();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Pool mode with filters
  if (mode === 'pool') {
    return (
      <div className="flex flex-col max-h-[calc(80vh-8rem)]">
        {/* Header */}
        

        {/* Filters */}
        {(onSearchChange || onCategoryChange) && (
          <div className="py-4 border-b space-y-4">
            <div className="flex gap-2 items-center p-1">
              {onSearchChange && (
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="flex-1"
                />
              )}
              {onCategoryChange && categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                  <SelectTrigger className="w-fit shrink-0">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{questions.length} questions available</span>
              <div className="flex items-center gap-2">
                <span>{selectedIds.size} selected</span>
                {maxAvailableSlots !== undefined && (
                  <span className="text-xs">(max {maxAvailableSlots} can be added)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {emptyMessage || 'No questions found'}
            </div>
          ) : (
            <div className={compact ? 'space-y-2' : 'space-y-3'}>
              {questions.map(question => {
                const isAlreadyAdded = disabledQuestionIds.has(question.id);
                const isSelected = selectedIds.has(question.id);
                const isLimitReached = maxAvailableSlots !== undefined && !isSelected && selectedIds.size >= maxAvailableSlots;
                const isDisabled = isAlreadyAdded || isLimitReached;

                return (
                  <Card
                    key={question.id}
                    className={`transition-colors ${
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                        : isSelected
                          ? 'cursor-pointer border-primary bg-primary/5 hover:border-primary hover:bg-primary/5'
                          : 'cursor-pointer hover:border-primary hover:bg-primary/5'
                    }`}
                    onClick={() => !isDisabled && handleQuestionClick(question)}
                  >
                    <CardContent className={compact ? 'p-3' : 'p-4'}>
                      <div className="flex items-center gap-3">
                        {multiSelect && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => !isDisabled && toggleSelection(question.id)}
                            disabled={isDisabled}
                            className="flex-shrink-0"
                          />
                        )}
                        <div className={compact ? 'flex-1 flex items-center justify-between gap-2 min-w-0' : 'flex-1'}>
                          <p className={`text-sm font-medium ${compact ? 'flex-1 min-w-0' : ''} ${isAlreadyAdded ? 'line-through text-muted-foreground' : ''}`}>
                            {question.question_text}
                          </p>
                          {compact && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {question.category && showCategory && (
                                <span className="inline-block px-2 py-0.5 text-xs bg-muted rounded whitespace-nowrap">
                                  {question.category}
                                </span>
                              )}
                              {isAlreadyAdded && (
                                <span className="inline-block px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded whitespace-nowrap">
                                  Already added
                                </span>
                              )}
                              {isLimitReached && !isAlreadyAdded && (
                                <span className="inline-block px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded whitespace-nowrap">
                                  Limit reached
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {!compact && question.category && showCategory && (
                          <span className="inline-block px-2 py-1 text-xs bg-muted rounded">
                            {question.category}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {multiSelect && onAddSelected && (
          <div className="pt-4 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={() => onNavigate?.('main')}>
              Cancel
            </Button>
            <Button
              onClick={onAddSelected}
              disabled={selectedIds.size === 0 || adding || (maxAvailableSlots !== undefined && selectedIds.size > maxAvailableSlots)}
            >
              <Library className="h-4 w-4 mr-2" />
              Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Selected
              {maxAvailableSlots !== undefined && ` (max ${maxAvailableSlots} can be added)`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Sortable mode (wizard)
  if (mode === 'sortable' && orderedQuestions && onQuestionChange) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col space-y-4">
        {maxQuestions !== undefined && (
          <div className="text-sm text-muted-foreground mb-2">
            Added questions: {orderedQuestions.length} / {maxQuestions}
          </div>
        )}

        <Card className="border-0 shadow-sm flex-1 overflow-hidden">
          <CardContent className="p-0">
            {orderedQuestions.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
                <p className="text-muted-foreground">
                  {emptyMessage || 'Add your first question above to get started.'}
                </p>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs font-semibold mb-2">Selected questions</p>
                <SortableList
                  items={orderedQuestions}
                  onSortEnd={(newOrderedQuestions) => {
                    const questionsWithUpdatedPositions = newOrderedQuestions.map((q, index) => ({
                      ...q,
                      position: index
                    }));
                    onQuestionChange({ orderedQuestions: questionsWithUpdatedPositions });
                  }}
                  renderItem={(question, _, knob) => {
                    const isEditingThis = isEditing(question.id);
                    return (
                      <Card className="shadow-sm cursor-grab active:cursor-grabbing">
                        <CardContent className={cn("p-2 flex items-center justify-between w-full hover:shadow-md transition-shadow gap-2")}>
                          {knob && <div className="flex-shrink-0">{knob}</div>}
                          {isEditingThis ? (
                            <div className="flex-1 flex gap-2">
                              <Input
                                type="text"
                                value={getEditText()}
                                onChange={(e) => {
                                  if (onEditTextChange) {
                                    onEditTextChange(e.target.value);
                                  } else {
                                    setLocalEditText(e.target.value);
                                  }
                                }}
                                className="flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(question.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm flex-1">{question.text}</span>
                              <div className="flex gap-2" style={{ pointerEvents: 'auto' }}>
                                {showEditDelete && (
                                  <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const q = questions.find(q => q.id === question.id);
                                    if (q) {
                                      if (onEditButtonClick) {
                                        onEditButtonClick(q);
                                      } else {
                                        handleStartEdit(q);
                                      }
                                    }
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onDeleteButtonClick) {
                                      const q = questions.find(q => q.id === question.id);
                                      if (q) {
                                        onDeleteButtonClick(q);
                                      }
                                    } else {
                                      handleDelete(question.id);
                                    }
                                  }}
                                  className="text-destructive hover:text-destructive"
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                  </>
                                )}
                                {renderCustomActions && (() => {
                                  const foundQuestion = questions.find(q => q.id === question.id);
                                  if (foundQuestion) {
                                    return renderCustomActions(foundQuestion);
                                  }
                                  // Convert ordered question to Question format for renderCustomActions
                                  const questionAsQuestion: Question = {
                                    id: question.id,
                                    question_text: question.text,
                                    created_at: new Date().toISOString(),
                                    updated_at: null,
                                    question_pool_id: question.questionPoolId ? parseInt(question.questionPoolId) : null,
                                    type: question.type,
                                  };
                                  return renderCustomActions(questionAsQuestion);
                                })()}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit mode with sorting
  if (mode === 'edit' && onQuestionOrderChange) {
    const sortedQuestions = [...questions].sort((a, b) => {
      const orderA = a.display_order ?? Infinity;
      const orderB = b.display_order ?? Infinity;
      return orderA - orderB;
    });

    return (
      <div className="space-y-2">
        {sortedQuestions.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
            <p className="text-muted-foreground">
              {emptyMessage || 'Add your first question above to get started.'}
            </p>
          </div>
        ) : (
          <SortableList
            items={sortedQuestions}
            onSortEnd={(newQuestions) => {
              const questionOrders = newQuestions.map((q, index) => ({
                questionId: q.id,
                displayOrder: index
              }));
              onQuestionOrderChange(questionOrders);
            }}
            renderItem={(question, _, knob) => {
              const isEditingThis = isEditing(question.id);
              const answerCount = question.answers?.length || 0;
              
              return (
                <Card className="hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
                  <CardContent className={cn("p-3 flex items-center gap-3")}>
                    {knob && <div className="flex-shrink-0">{knob}</div>}
                    {isEditingThis ? (
                      <div className="flex gap-2 flex-1">
                        <Input
                          type="text"
                          value={getEditText()}
                          onChange={(e) => {
                            if (onEditTextChange) {
                              onEditTextChange(e.target.value);
                            } else {
                              setLocalEditText(e.target.value);
                            }
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(question.id)}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1">
                        <h3 className="text-sm font-medium text-foreground flex-1 min-w-0">
                          {question.question_text}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {showAnswers && onViewAnswers && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewAnswers(question.id, question.question_text)}
                              disabled={answerCount === 0}
                              className="h-7 text-xs"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              <span>
                                {answerCount > 0 
                                  ? `${answerCount} answer${answerCount > 1 ? 's' : ''}`
                                  : 'No answers'}
                              </span>
                            </Button>
                          )}
                          {showEditDelete && !question.question_pool_id && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(question)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(question.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {renderCustomActions && renderCustomActions(question)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }}
          />
        )}
      </div>
    );
  }

  // Select, View modes
  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No questions yet</h3>
        <p className="text-muted-foreground">
          {emptyMessage || 'Add your first question above to get started.'}
        </p>
      </div>
    );
  }

  return (
    <div className={mode === 'view' ? 'grid gap-3' : mode === 'select' ? 'space-y-2' : 'divide-y max-h-96 overflow-y-auto space-y-0'}>
      {questions.map(question => {
        const stat = getStat(question.id);
        const userAnswer = getUserAnswer?.(question.id);
        const isEditingThis = isEditing(question.id);
        const isDisabled = disabledQuestionIds.has(question.id);
        const validationResult = validateQuestionSelection && !validateQuestionSelection(question.id).valid
          ? validateQuestionSelection(question.id)
          : null;
        const unavailableReason = validationResult?.reason || null;

        const isHighlighted = highlightedQuestionId === question.id;
        // If highlighted, show as active (not disabled) but still not clickable
        const shouldShowAsDisabled = isDisabled && !isHighlighted;
        
        // Determine badge text: combine "Zugewiesen" and unavailableReason if both exist
        // Always check unavailableReason even if highlighted, to show combined badge
        let statusBadgeText: string | null = null;
        if (isHighlighted) {
          statusBadgeText = 'Assigned to textbox';
        } else if (unavailableReason) {
          statusBadgeText = unavailableReason;
        }
        const showStatusBadge = mode === 'select' && statusBadgeText;

        if (mode === 'select' && shouldShowAsDisabled && unavailableReason) {
          return (
            <Card 
              key={question.id} 
              className="border shadow-sm opacity-50"
            >
              <CardContent className="p-3" style={{ cursor: 'not-allowed' }}>
                <div className="flex items-start justify-between" >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-foreground leading-relaxed flex-1">
                        {question.question_text}
                      </p>
                      {showStatusBadge && (
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${
                            isHighlighted 
                              ? 'bg-secondary text-secondary-foreground border-secondary/20' 
                              : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}
                        >
                          {statusBadgeText}
                        </Badge>
                      )}
                    </div>
                    {showDates && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(question.created_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <Card 
            key={question.id} 
            className={
              mode === 'view' 
                ? 'border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20' 
                : mode === 'select' && !shouldShowAsDisabled
                  ? isHighlighted
                    ? 'border shadow-sm cursor-not-allowed hover:shadow-md transition-all duration-200 hover:border-primary/20 bg-secondary'
                    : 'border shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20 hover:bg-primary/5'
                  : 'border shadow-sm'
            }
            onClick={(e) => {
              // Only handle clicks in select mode and if not disabled and not highlighted
              if (mode === 'select' && !shouldShowAsDisabled && !isHighlighted) {
                const target = e.target as HTMLElement;
                // Don't trigger selection if clicking on buttons or interactive elements
                if (target.closest('button')) return;
                
                if (validateQuestionSelection) {
                  const validation = validateQuestionSelection(question.id);
                  if (!validation.valid) {
                    alert(validation.reason || 'This question cannot be selected.');
                    return;
                  }
                }
                
                const position = question.display_order ?? question.position;
                onQuestionSelect?.(question.id, question.question_text, position !== undefined ? position : undefined);
              }
            }}
          >
            <CardContent className={mode === 'view' ? 'p-6' : 'p-3'}>
              {isEditingThis ? (
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={getEditText()}
                    onChange={(e) => {
                      if (onEditTextChange) {
                        onEditTextChange(e.target.value);
                      } else {
                        setLocalEditText(e.target.value);
                      }
                    }}
                    className="w-full"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end ">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(question.id)}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`${mode === 'view' ? 'text-lg' : 'text-sm'} font-medium text-foreground flex-1`}>
                        {question.question_text}
                        {question.isNew && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            New
                          </span>
                        )}
                        {question.question_pool_id && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                            From Pool
                          </span>
                        )}
                        {question.answered_by_user && mode === 'select' && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full bg-ring/10 text-ring border border-ring/20">
                            Answered by you
                          </span>
                        )}
                      </h3>
                      {showStatusBadge && (
                        <Badge 
                          variant="highlight" 
                          // className={`${
                          //   isHighlighted 
                          //     ? 'bg-secondary text-secondary-foreground border-secondary/20' 
                          //     : 'bg-destructive/10 text-destructive border-destructive/20'
                          // }`}
                        >
                          {statusBadgeText}
                        </Badge>
                      )}
                    </div>
                    {showStats && stat && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {userRole === 'author' ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {stat.answer_count > 0 ? 'You have answered' : 'Not answered yet'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {stat.answer_count} answers from {stat.unique_users} users
                          </span>
                        )}
                      </div>
                    )}

                    {showDates && mode !== 'edit' && (
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatDate(question.created_at)}</span>
                        {question.updated_at && (
                          <>
                            <span>|</span>
                            <span>Updated {formatDate(question.updated_at)}</span>
                          </>
                        )}
                      </div>
                    )}

                    {userAnswer && mode === 'view' && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                        <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                        <p className="text-sm text-foreground" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>{userAnswer.answer_text}</p>
                      </div>
                    )}

                    {showAnswers && mode !== 'edit' && (
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {question.answers && question.answers.length > 0 
                              ? `${question.answers.length} answer${question.answers.length > 1 ? 's' : ''}`
                              : 'No answers yet'}
                          </p>
                          {onViewAnswers && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewAnswers(question.id, question.question_text);
                              }}
                              disabled={!question.answers || question.answers.length === 0}
                              className="space-x-1 h-7 text-xs"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>
                                {question.answers && question.answers.length > 0
                                  ? `${question.answers.length} answer${question.answers.length > 1 ? 's' : ''}`
                                  : 'No answers'}
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">

                    {showEditDelete && mode !== 'edit' && !question.question_pool_id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEditButtonClick) {
                              onEditButtonClick(question);
                            } else {
                              handleStartEdit(question);
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteButtonClick) {
                              onDeleteButtonClick(question);
                            } else {
                              handleDelete(question.id);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {showAnswers && mode !== 'edit' && onViewAnswers && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewAnswers(question.id, question.question_text);
                        }}
                        disabled={!question.answers || question.answers.length === 0}
                        className="h-7 text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>
                          {question.answers && question.answers.length > 0
                            ? `${question.answers.length} answer${question.answers.length > 1 ? 's' : ''}`
                            : 'No answers'}
                        </span>
                      </Button>
                    )}

                    {renderCustomActions && renderCustomActions(question)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

