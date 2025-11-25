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

interface QuestionPoolContentProps {
  bookId: number;
  onQuestionsAdded: (questions: any[]) => void;
  onNavigate: (view: string) => void;
  singleSelect?: boolean;
}

export function QuestionPoolContent({ bookId, onQuestionsAdded, onNavigate, singleSelect = false }: QuestionPoolContentProps) {
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
  }, [questions, selectedCategory, searchTerm]);

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
    if (singleSelect) {
      setSelectedIds(new Set([id]));
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
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
        const createdQuestions = await apiService.addQuestionsFromPool(bookId, Array.from(selectedIds));
        onQuestionsAdded(createdQuestions);
      }
      onNavigate('main');
    } catch (error) {
      console.error('Error adding questions:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleQuestionClick = (id: number) => {
    if (singleSelect) {
      const selectedQuestion = questions.find(q => q.id === id);
      if (selectedQuestion) {
        onQuestionsAdded([selectedQuestion]);
        onNavigate('main');
      }
    } else {
      toggleSelection(id);
    }
  };

  return (
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
          <span>{selectedIds.size} selected</span>
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
          <div className="space-y-3">
            {filteredQuestions.map(question => (
              <Card
                key={question.id}
                className={`cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 ${
                  selectedIds.has(question.id) ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => handleQuestionClick(question.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {!singleSelect && (
                      <Checkbox
                        checked={selectedIds.has(question.id)}
                        onCheckedChange={() => toggleSelection(question.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{question.question_text}</p>
                      {question.category && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-muted rounded">
                          {question.category}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!singleSelect && (
        <div className="pt-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={() => onNavigate('main')}>
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
}

