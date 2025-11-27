import { BookFriendsPanel } from '../../shared/book-friends-panel';
import type { BookFriend, User } from '../../book-manager-content';
import CompactList from '../../../../shared/compact-list';
import ProfilePicture from '../../../users/profile-picture';
import { Button } from '../../../../ui/primitives/button';
import { Checkbox } from '../../../../ui/primitives/checkbox';
import { Label } from '../../../../ui/primitives/label';
import { ChevronLeft, UserRoundX } from 'lucide-react';
import { StepContainer } from '../../shared/step-container';

interface PendingInvite {
  name: string;
  email: string;
}

interface WizardFriendsStepProps {
  friends: BookFriend[];
  pendingInvites: PendingInvite[];
  availableFriends: User[];
  showFriendPicker: boolean;
  onOpenFriendPicker: () => void;
  onCloseFriendPicker: () => void;
  onSelectFriend: (friend: User) => void;
  onInviteFriend: () => void;
  onRemoveFriend: (friendId: number) => void;
  groupChatEnabled: boolean;
  onGroupChatChange: (enabled: boolean) => void;
}

export function WizardFriendsStep({
  friends,
  pendingInvites,
  availableFriends,
  showFriendPicker,
  onOpenFriendPicker,
  onCloseFriendPicker,
  onSelectFriend,
  onInviteFriend,
  onRemoveFriend,
  groupChatEnabled,
  onGroupChatChange,
}: WizardFriendsStepProps) {
  const availableList = availableFriends.filter((friend) => !friends.some((f) => f.id === friend.id));

  const renderFriend = (friend: BookFriend) => (
    <StepContainer variant="card" padding="sm" className="flex items-center justify-between gap-3" key={friend.id}>
      <div className="flex items-center gap-3 min-w-0">
        <ProfilePicture name={friend.name} size="sm" userId={friend.id} />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{friend.name}</p>
          <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onRemoveFriend(friend.id)}>
        <UserRoundX className="h-4 w-4 mr-1" />
        Remove
      </Button>
    </StepContainer>
  );

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      <div>
        <h3 className="text-lg font-semibold mb-2">Collaborators</h3>
        <p className="text-sm text-muted-foreground">
          Add friends who can collaborate on this book. You can also invite new people—invites will be sent once the book is created.
        </p>
      </div>

      <BookFriendsPanel
        friends={friends}
        onAddFriend={onOpenFriendPicker}
        onInviteFriend={onInviteFriend}
        renderFriend={renderFriend}
        leftControls={
          <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <Checkbox checked={groupChatEnabled} onCheckedChange={(checked) => onGroupChatChange(Boolean(checked))} />
            Gruppenchat
          </Label>
        }
      />

      {pendingInvites.length > 0 && (
        <StepContainer variant="muted" padding="sm">
          <div className="space-y-1">
          <p className="text-sm font-medium">Pending Invitations</p>
          {pendingInvites.map((invite, index) => (
            <p key={`${invite.email}-${index}`} className="text-sm text-muted-foreground">
              {invite.name} &lt;{invite.email}&gt;
            </p>
          )          )}
          <p className="text-xs text-muted-foreground">Invitations are sent once the book is created.</p>
          </div>
        </StepContainer>
      )}

      {showFriendPicker && (
        <StepContainer variant="card" padding="md" className="bg-card/80">
          <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onCloseFriendPicker} className="px-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              {availableList.length} friend{availableList.length === 1 ? '' : 's'} available
            </span>
          </div>
          {availableList.length > 0 ? (
            <CompactList
              items={availableList}
              keyExtractor={(friend) => friend.id.toString()}
              renderItem={(friend) => (
                <StepContainer
                  key={friend.id}
                  as="button"
                  variant="default"
                  padding="sm"
                  className="w-full flex items-center gap-3 text-left hover:bg-muted transition cursor-pointer"
                  onClick={() => onSelectFriend(friend)}
                >
                  <ProfilePicture name={friend.name} size="sm" userId={friend.id} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{friend.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                  </div>
                  <span className="text-xs text-primary font-medium">Add</span>
                </StepContainer>
              )}
              itemsPerPage={8}
            />
          ) : (
            <p className="text-center text-muted-foreground py-6">All friends have been added already.</p>
          )}
          </div>
        </StepContainer>
      )}
    </div>
  );
}

