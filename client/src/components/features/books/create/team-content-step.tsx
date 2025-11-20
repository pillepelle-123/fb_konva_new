import { useState, useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import { CreatableCombobox, type CreatableComboboxOption } from '../../../ui/primitives/creatable-combobox';
import InviteUserDialog from '../invite-user-dialog';
import { useAuth } from '../../../../context/auth-context';
import { curatedQuestions } from './types';
import type { WizardState, Friend, InviteDraft } from './types';

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
  const { token } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | undefined>();
  const [initialEmail, setInitialEmail] = useState<string>('');
  const [initialName, setInitialName] = useState<string>('');
  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  // Helper function to check if a string is a valid email
  const isValidEmail = (text: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(text.trim());
  };

  // Convert friends to combobox options
  const friendOptions: CreatableComboboxOption[] = useMemo(() => {
    // Filter out already selected friends
    const available = availableFriends.filter(
      (friend) => !wizardState.team.selectedFriends.some((f) => f.id === friend.id)
    );
    return available.map((friend) => ({
      value: friend.id.toString(),
      label: friend.name,
      description: friend.email,
      userId: friend.id,
    }));
  }, [availableFriends, wizardState.team.selectedFriends]);

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

  const handleSelectFriend = (value: string | undefined) => {
    if (!value) return;
    const friendId = parseInt(value, 10);
    const friend = availableFriends.find((f) => f.id === friendId);
    if (friend) {
      addFriend(friend);
    }
  };

  const handleCreateFriend = async (search: string): Promise<string | CreatableComboboxOption | void> => {
    // Check if search text is a valid email address
    if (isValidEmail(search)) {
      setInitialEmail(search.trim());
      setInitialName('');
    } else {
      setInitialEmail('');
      setInitialName(search.trim());
    }
    setInviteDialogOpen(true);
    // Return a promise that will be resolved when the invite is successful
    return new Promise((resolve) => {
      // Store resolve function to call it after successful invite
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__pendingInviteResolve = resolve;
    });
  };

  const handleInviteFriend = async (name: string, email: string) => {
    setInviteError(undefined);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Check if user already exists as a friend
      const friendsResponse = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (friendsResponse.ok) {
        const friends = await friendsResponse.json();
        const existingFriend = friends.find((f: Friend) => f.email === email);
        
        if (existingFriend) {
          // User already exists as friend, add to selected friends
          addFriend(existingFriend);
          
          // Resolve the promise with the existing friend's ID
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window as any).__pendingInviteResolve) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).__pendingInviteResolve(existingFriend.id.toString());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window as any).__pendingInviteResolve;
          }
          
          setInviteDialogOpen(false);
          setInviteError(undefined);
          setInitialEmail('');
          setInitialName('');
          return;
        }
      }

      // User doesn't exist yet, add as InviteDraft
      // This will be sent via /invitations/send after book creation
      const newInvite: InviteDraft = {
        id: `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim() || email.split('@')[0],
        email: email.trim(),
      };

      // Add to invites array
      onTeamChange({
        invites: [...wizardState.team.invites, newInvite],
      });

      // Also add as a temporary friend object for display purposes
      const tempFriend: Friend = {
        id: -1, // Temporary ID, will be replaced when invitation is sent
        name: newInvite.name,
        email: newInvite.email,
      };
      addFriend(tempFriend);

      // Resolve the promise with a temporary value
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__pendingInviteResolve) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__pendingInviteResolve(newInvite.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).__pendingInviteResolve;
      }

      setInviteDialogOpen(false);
      setInviteError(undefined);
      setInitialEmail('');
      setInitialName('');
    } catch (error) {
      console.error('Error inviting friend:', error);
      setInviteError('Failed to invite friend. Please try again.');
    }
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
              <CreatableCombobox
                options={friendOptions}
                value={undefined}
                onChange={handleSelectFriend}
                onCreateOption={handleCreateFriend}
                placeholder="Search or invite friend..."
                inputPlaceholder="Search friends..."
                emptyLabel="No friends found"
                createLabel={(search) => `Invite ${search}`}
                allowClear={false}
              />
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

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={(open) => {
          setInviteDialogOpen(open);
          if (!open) {
            setInitialEmail('');
            setInitialName('');
            setInviteError(undefined);
          }
        }}
        onInvite={handleInviteFriend}
        errorMessage={inviteError}
        initialEmail={initialEmail}
        initialName={initialName}
      />
    </div>
  );
}

