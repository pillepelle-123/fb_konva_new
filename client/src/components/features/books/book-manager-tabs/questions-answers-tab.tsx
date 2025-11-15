import { RefObject } from 'react';
import { Card, CardContent, CardHeader } from '../../../ui/composites/card';
import { Button } from '../../../ui/primitives/button';
import { Input } from '../../../ui/primitives/input';
import { Library, MessageCircleQuestion, Plus, Save, SquarePen, Trash2, X } from 'lucide-react';
import type { Question } from '../book-manager-content';

interface QuestionsAnswersTabProps {
  questionsLoading: boolean;
  questions: Question[];
  editingId: string | null;
  editText: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  newQuestion: string;
  onNewQuestionChange: (value: string) => void;
  onAddQuestion: (event: React.FormEvent<HTMLFormElement>) => void;
  onBrowseQuestionPool: () => void;
  onStartEdit: (question: Question) => void;
  onEditQuestion: (questionId: string) => void;
  onCancelEdit: () => void;
  onDeleteQuestionRequest: (questionId: string) => void;
  onEditTextChange: (value: string) => void;
}

export function QuestionsAnswersTab({
  questionsLoading,
  questions,
  editingId,
  editText,
  editInputRef,
  newQuestion,
  onNewQuestionChange,
  onAddQuestion,
  onBrowseQuestionPool,
  onStartEdit,
  onEditQuestion,
  onCancelEdit,
  onDeleteQuestionRequest,
  onEditTextChange,
}: QuestionsAnswersTabProps) {
  if (questionsLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add New Question</h3>
            <Button variant="outline" size="sm" onClick={onBrowseQuestionPool}>
              <Library className="h-4 w-4 mr-2" />
              Browse Question Pool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAddQuestion} className="flex gap-2">
            <Input
              type="text"
              value={newQuestion}
              onChange={(e) => onNewQuestionChange(e.target.value)}
              placeholder="Enter new question..."
              className="flex-1"
            />
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </form>
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageCircleQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No questions yet</h3>
            <p className="text-muted-foreground">Add your first question above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {editingId === question.id && !question.question_pool_id ? (
                        <div className="space-y-3">
                          <Input
                            ref={editInputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => onEditTextChange(e.target.value)}
                            className="text-lg font-medium"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onEditQuestion(question.id)}>
                              <Save className="h-4 w-4 mr-2" />
                              Save
                            </Button>
                            <Button variant="outline" size="sm" onClick={onCancelEdit}>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-lg font-medium text-foreground mb-2">
                            {question.question_text}
                            {question.question_pool_id && (
                              <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                From Pool
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(question.created_at).toLocaleDateString()}
                            {question.updated_at && <> • Updated: {new Date(question.updated_at).toLocaleDateString()}</>}
                          </p>
                        </>
                      )}
                    </div>

                    {editingId !== question.id && !question.question_pool_id && (
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => onStartEdit(question)}>
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteQuestionRequest(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {editingId !== question.id && (
                    <div className="border-t pt-4">
                      <h5 className="text-sm font-medium text-muted-foreground mb-3">
                        Answers ({question.answers?.length || 0})
                      </h5>
                      {question.answers && question.answers.length > 0 ? (
                        <div className="space-y-3">
                          {question.answers.map((answer) => (
                            <div key={answer.id} className="bg-muted/30 rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-sm font-medium">{answer.user_name}</span>
                                <span className="text-xs text-muted-foreground">{answer.user_email}</span>
                              </div>
                              <p className="text-sm">
                                {answer.answer_text || <em className="text-muted-foreground">No answer provided</em>}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No answers yet</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

