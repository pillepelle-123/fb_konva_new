import { Card, CardContent } from '../../ui/composites/card';
import { Button } from '../../ui/primitives/button';
import { MessageCircleQuestionMark, ArrowLeft } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import type { Answer } from './question-list';

export interface AnswerListProps {
  questionId: string;
  questionText: string;
  answers: Answer[];
  loading?: boolean;
  onBack?: () => void;
  emptyMessage?: string;
}

export function AnswerList({
  questionId,
  questionText,
  answers,
  loading = false,
  onBack,
  emptyMessage,
}: AnswerListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading answers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b mb-4">
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">Answers</h2>
          <p className="text-sm text-muted-foreground mt-1 truncate">{questionText}</p>
        </div>
      </div>

      {/* Answers List */}
      <div className="flex-1 overflow-y-auto">
        {answers.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircleQuestionMark className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No answers yet</h3>
            <p className="text-muted-foreground">
              {emptyMessage || 'No one has answered this question yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {answers.map((answer) => (
              <Card key={answer.id} className="border shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ProfilePicture 
                      name={answer.user_name} 
                      size="sm" 
                      userId={answer.user_id}
                      variant="withColoredBorder"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{answer.user_name}</p>
                          <p className="text-xs text-muted-foreground">{answer.user_email}</p>
                        </div>
                        {answer.created_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {new Date(answer.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {answer.answer_text || <em className="text-muted-foreground">No answer provided</em>}
                      </p>
                      {answer.updated_at && answer.updated_at !== answer.created_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {new Date(answer.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


