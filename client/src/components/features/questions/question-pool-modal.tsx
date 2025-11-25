import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '../../ui/primitives/button';
import { Input } from '../../ui/primitives/input';
import { SelectInput } from '../../ui/primitives/select-input';
import { Checkbox } from '../../ui/primitives/checkbox';
import { Card, CardContent } from '../../ui/composites/card';
import { apiService } from '../../../services/api';

interface QuestionPoolItem {
  id: number;
  question_text: string;
  category: string | null;
  language: string;
}

interface QuestionPoolItem {
  id: number;
  question_text: string;
  category: string | null;
  language: string;
}

interface QuestionPoolModalProps {
  bookId: number | string;
  onClose: () => void;
  onQuestionsAdded: (questions: QuestionPoolItem[]) => void;
  singleSelect?: boolean;
  alreadyAddedQuestionPoolIds?: Set<number>; // IDs of questions already added (for wizard mode)
  maxAvailableSlots?: number; // Maximum number of questions that can still be added (for wizard mode)
}

export default function QuestionPoolModal({ 
  bookId, 
  onClose, 
  onQuestionsAdded, 
  singleSelect = false,
  alreadyAddedQuestionPoolIds = new Set(),
  maxAvailableSlots
}: QuestionPoolModalProps) {
  const [questions, setQuestions] = useState<QuestionPoolItem[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionPoolItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadCategories();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, selectedCategory, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadQuestions = async () => {
    try {
      const data = await apiService.getQuestionPool();
      setQuestions(data);
    } catch (error) {
      console.error('Error loading question pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiService.getQuestionPoolCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterQuestions = () => {
    let filtered = questions;

    if (selectedCategory) {
      filtered = filtered.filter(q => q.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.question_text.toLowerCase().includes(term));
    }

    setFilteredQuestions(filtered);
  };

  const toggleSelection = (id: number) => {
    // Don't allow selection if question is already added
    if (alreadyAddedQuestionPoolIds.has(id)) {
      return;
    }
    
    if (singleSelect) {
      setSelectedIds(new Set([id]));
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        // Check if we've reached the maximum available slots
        if (maxAvailableSlots !== undefined && newSelected.size >= maxAvailableSlots) {
          return; // Don't allow adding more than available slots
        }
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    }
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;

    setAdding(true);
    try {
      if (singleSelect) {
        const selectedId = Array.from(selectedIds)[0];
        const selectedQuestion = questions.find(q => q.id === selectedId);
        if (selectedQuestion) {
          onQuestionsAdded([selectedQuestion]);
        }
      } else {
        // Check if we're in wizard mode (bookId is not a valid number)
        const isWizardMode = typeof bookId === 'string' || bookId === 0;
        
        if (isWizardMode) {
          // In wizard mode, return the questions directly without API call
          const selectedQuestions = questions.filter(q => selectedIds.has(q.id));
          onQuestionsAdded(selectedQuestions);
        } else {
          // Normal mode: create questions via API
          const createdQuestions = await apiService.addQuestionsFromPool(bookId as number, Array.from(selectedIds));
          onQuestionsAdded(createdQuestions);
        }
      }
      onClose();
    } catch (error) {
      console.error('Error adding questions:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleQuestionClick = (id: number) => {
    // Don't allow click if question is already added
    if (alreadyAddedQuestionPoolIds.has(id)) {
      return;
    }
    
    // Don't allow click if we've reached the maximum available slots (for multi-select)
    if (!singleSelect && maxAvailableSlots !== undefined && selectedIds.size >= maxAvailableSlots && !selectedIds.has(id)) {
      return;
    }
    
    if (singleSelect) {
      const selectedQuestion = questions.find(q => q.id === id);
      if (selectedQuestion) {
        onQuestionsAdded([selectedQuestion]);
        onClose();
      }
    } else {
      toggleSelection(id);
    }
  };

  const content = (
    <div className="flex flex-col max-h-[calc(80vh-8rem)]">
        {/* Header */}
        <div className="pb-4 border-b">
          <h2 className="text-lg font-semibold">Browse Question Pool</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {singleSelect ? 'Click a question to select it' : 'Select questions to add to your book'}
          </p>
        </div>

        {/* Filters */}
        <div className="py-4 border-b space-y-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="flex-1"
            />
            <SelectInput
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              className="w-fit shrink-0"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </SelectInput>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredQuestions.length} questions available</span>
            <div className="flex items-center gap-2">
              <span>{selectedIds.size} selected</span>
              {maxAvailableSlots !== undefined && (
                <span className="text-xs">
                  (max {maxAvailableSlots} can be added)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-scroll py-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No questions found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredQuestions.map(question => {
                const isAlreadyAdded = alreadyAddedQuestionPoolIds.has(question.id);
                const isSelected = selectedIds.has(question.id);
                const isSlotLimitReached = maxAvailableSlots !== undefined && !isSelected && selectedIds.size >= maxAvailableSlots;
                const isDisabled = isAlreadyAdded || isSlotLimitReached;
                
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
                    onClick={() => !isDisabled && handleQuestionClick(question.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {!singleSelect && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => !isDisabled && toggleSelection(question.id)}
                            disabled={isDisabled}
                            className="flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <p className={`text-sm font-medium flex-1 min-w-0 ${isAlreadyAdded ? 'line-through text-muted-foreground' : ''}`}>
                            {question.question_text}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {question.category && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-muted rounded whitespace-nowrap">
                                {question.category}
                              </span>
                            )}
                            {isAlreadyAdded && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded whitespace-nowrap">
                                Already added
                              </span>
                            )}
                            {isSlotLimitReached && !isAlreadyAdded && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded whitespace-nowrap">
                                Limit reached
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {!singleSelect && (
          <div className="pt-4 border-t flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0 || adding}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Selected
            </Button>
          </div>
        )}
    </div>
  );

  return content;
}
