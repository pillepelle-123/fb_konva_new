import { useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useEditor } from '../../../../context/editor-context';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlays/popover';
import ProfilePicture from '../../users/profile-picture';
import { CircleUser } from 'lucide-react';

interface BookFriend {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface PageAssignmentPopoverProps {
  children: React.ReactNode;
  currentPage: number;
  bookId: number;
  onAssignUser: (user: BookFriend | null) => void;
}

export default function PageAssignmentPopover({ 
  children, 
  currentPage, 
  bookId, 
  onAssignUser 
}: PageAssignmentPopoverProps) {
  const { user } = useAuth();
  const { state: editorState, checkUserQuestionConflicts, getQuestionText } = useEditor();
  const [open, setOpen] = useState(false);

  // Use bookFriends from editor state instead of fetching
  // Ensure current user is included if not already in the list
  const bookFriends = editorState.bookFriends || [];
  const currentUserInList = bookFriends.find(f => f.id === user?.id);
  const allFriends = currentUserInList ? bookFriends : [...bookFriends, { id: user!.id, name: user!.name, email: user!.email, role: 'owner' }];

  const handleAssignUser = (userToAssign: BookFriend | null) => {
    // If removing assignment, allow it without validation
    if (!userToAssign) {
      onAssignUser(null);
      setOpen(false);
      return;
    }

    // Skip validation if assigning the same user that's already assigned
    const currentAssignedUser = editorState.pageAssignments[currentPage];
    if (currentAssignedUser && currentAssignedUser.id === userToAssign.id) {
      // Same user, no change needed
      setOpen(false);
      return;
    }

    // Check for question conflicts before assigning user
    const conflicts = checkUserQuestionConflicts(userToAssign.id, currentPage);
    
    if (conflicts.length > 0) {
      // Close popover first so alert is not covered
      setOpen(false);
      
      // Build conflict message with better formatting
      const conflictMessages = conflicts.map(conflict => {
        const pageList = conflict.pageNumbers.length === 1 
          ? `page ${conflict.pageNumbers[0]}` 
          : `pages ${conflict.pageNumbers.join(', ')}`;
        return `"${conflict.questionText || getQuestionText(conflict.questionId) || 'Unknown question'}" (already on ${pageList})`;
      }).join('\n');
      
      // Show alert after a short delay to ensure popover is closed
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showAlert', {
          detail: { 
            message: `Cannot assign ${userToAssign.name} to page ${currentPage}.\n\nThe following ${conflicts.length === 1 ? 'question is' : 'questions are'} already assigned to this user on other pages:\n${conflictMessages}`,
            x: 100,
            y: 100,
            width: 500,
            height: 250
          }
        }));
      }, 100);
      return;
    }

    // No conflicts, proceed with assignment
    onAssignUser(userToAssign);
    setOpen(false);
  };

  const assignedUser = editorState.pageAssignments[currentPage];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" side="bottom">
        <div className="space-y-2">
          <div className="text-sm font-medium px-2 py-1">
            Assign Page {currentPage}
          </div>
          
          {assignedUser && (
            <div 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
              onClick={() => handleAssignUser(null)}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <CircleUser className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Remove assignment</span>
            </div>
          )}
          
          <div className="max-h-48 overflow-y-auto space-y-1">
            {allFriends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer ${
                  assignedUser?.id === friend.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => handleAssignUser(friend)}
              >
                <ProfilePicture 
                  name={friend.name} 
                  size="sm" 
                  userId={friend.id} 
                  variant="withColoredBorder"
                  className="w-8 h-8"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{friend.name}</p>
                </div>
                {assignedUser?.id === friend.id && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </div>
            ))}
            {allFriends.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No friends in this book
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}