import { Plus, Users } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import { curatedQuestions } from './types';
import type { WizardState, Friend } from './types';

interface TeamContentStepProps {
  wizardState: WizardState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  onQuestionChange: (data: Partial<WizardState['questions']>) => void;
  availableFriends: Friend[];
  openCustomQuestionModal: () => void;
}

export function TeamContentStep({
  wizardState,
  onTeamChange,
  onQuestionChange,
  availableFriends,
  openCustomQuestionModal,
}: TeamContentStepProps) {
  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  const toggleQuestion = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      onQuestionChange({
        selectedDefaults: selectedQuestionIds.filter((q) => q !== id),
      });
    } else {
      onQuestionChange({
        selectedDefaults: [...selectedQuestionIds, id],
      });
    }
  };

  const addFriend = (friend: Friend) => {
    if (wizardState.team.selectedFriends.some((f) => f.id === friend.id)) return;
    onTeamChange({
      selectedFriends: [...wizardState.team.selectedFriends, friend],
    });
  };

  const removeFriend = (friendId: number) => {
    onTeamChange({
      selectedFriends: wizardState.team.selectedFriends.filter((friend) => friend.id !== friendId),
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Team & Content (optional)</h2>
            <p className="text-sm text-muted-foreground">Invite collaborators and prep the questions they'll answer.</p>
          </div>
        </div>

        {/* Two columns side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Collaborators */}
          <div className="rounded-xl bg-white shadow-sm border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              Collaborators
              <Badge variant="outline" className="text-[10px]">Optional</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select friends to invite (they'll receive access after the book is created).</p>
              <div className="flex flex-wrap gap-2">
                {availableFriends.map((friend) => (
                  <Button
                    key={friend.id}
                    variant={wizardState.team.selectedFriends.some((f) => f.id === friend.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => addFriend(friend)}
                  >
                    {friend.name}
                  </Button>
                ))}
              </div>
              {wizardState.team.selectedFriends.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Selected</p>
                  <div className="flex flex-wrap gap-2">
                    {wizardState.team.selectedFriends.map((friend) => (
                      <Badge key={friend.id} variant="secondary" className="flex items-center gap-2">
                        {friend.name}
                        <button onClick={() => removeFriend(friend.id)} className="text-xs text-muted-foreground hover:text-foreground">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="group-chat"
                  checked={wizardState.team.enableGroupChat}
                  onChange={(e) => onTeamChange({ enableGroupChat: e.target.checked })}
                />
                <label htmlFor="group-chat" className="text-sm text-muted-foreground">
                  Enable messenger group chat for collaborators
                </label>
              </div>

              <div className="mt-3">
                <p className="text-sm font-semibold">Number of pages per user</p>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3].map((n) => (
                    <Button
                      key={n}
                      variant={wizardState.team.pagesPerUser === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTeamChange({ pagesPerUser: n as 1 | 2 | 3 })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total pages = pages per user × number of selected users − 4 special pages (min. 24)
                </p>
              </div>
            </div>
          </div>

          {/* Right: Question set */}
          <div className="rounded-xl bg-white shadow-sm border p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              Question set
              <Badge variant="outline" className="text-[10px]">Optional</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select from our curated prompts or add your own.</p>
              <div className="space-y-2">
                {curatedQuestions.map((question) => (
                  <label key={question.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={() => toggleQuestion(question.id)}
                    />
                    <span>{question.text}</span>
                  </label>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={openCustomQuestionModal} className="mt-2">
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
      </div>
    </div>
  );
}

