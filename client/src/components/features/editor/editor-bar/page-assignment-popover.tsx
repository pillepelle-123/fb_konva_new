import { useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useEditor } from '../../../../context/editor-context';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/overlays/popover';
import ProfilePicture from '../../users/profile-picture';
import { Plus, Send, X } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import InviteUserDialog from '../../books/invite-user-dialog';
import SelectFriendDialog from '../../friends/select-friend-dialog';
import { toast } from 'sonner';

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
  const { user, token } = useAuth();
  const { state: editorState, dispatch, checkUserQuestionConflicts, getQuestionText } = useEditor();
  const [open, setOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [findFriendsDialogOpen, setFindFriendsDialogOpen] = useState(false);
  const currentPageData = editorState.currentBook?.pages.find((page) => page.pageNumber === currentPage);
  const isCoverPage =
    currentPageData?.pageType === 'back-cover' ||
    currentPageData?.pageType === 'front-cover' ||
    currentPage === 1 ||
    currentPage === 2;

  // Use bookFriends from editor state instead of fetching
  // Ensure current user is included if not already in the list
  const bookFriends = editorState.bookFriends || [];
  const currentUserInList = bookFriends.find(f => f.id === user?.id);
  const allFriends = currentUserInList ? bookFriends : [...bookFriends, { id: user!.id, name: user!.name, email: user!.email, role: 'publisher' }];

  const handleAssignUser = (userToAssign: BookFriend | null) => {
    // If removing assignment, allow it without validation
    if (!userToAssign) {
      onAssignUser(null);
      setOpen(false);
      return;
    }

    if (isCoverPage) {
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
      
      // Show toast error after a short delay to ensure popover is closed
      setTimeout(() => {
        toast.error(
          `Cannot assign ${userToAssign.name} to page ${currentPage}.\n\nThe following ${conflicts.length === 1 ? 'question is' : 'questions are'} already assigned to this user on other pages:\n${conflictMessages}`,
          {
            duration: 5000, // Show for 5 seconds to allow reading longer messages
          }
        );
      }, 100);
      return;
    }

    // No conflicts, proceed with assignment
    onAssignUser(userToAssign);
    setOpen(false);
    // Show toast notification
    toast.success(`Page ${currentPage} assigned to ${userToAssign.name}`);
  };

  const handleSelectFriend = async (selectedUser: { id: number; name: string; email: string }) => {
    if (isCoverPage) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Check if user is already in bookFriends
      const isInBook = bookFriends.some(f => f.id === selectedUser.id);
      
      if (!isInBook) {
        // Add friend to book first
        const addToBookResponse = await fetch(`${apiUrl}/books/${bookId}/friends`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            friendId: selectedUser.id,
            book_role: 'author',
            page_access_level: 'own_page',
            editor_interaction_level: 'full_edit'
          })
        });
        
        if (!addToBookResponse.ok) {
          console.error('Failed to add friend to book');
          return;
        }
        
        // Refresh bookFriends list
        const friendsResponse = await fetch(`${apiUrl}/books/${bookId}/friends`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (friendsResponse.ok) {
          const updatedBookFriends = await friendsResponse.json();
          dispatch({ type: 'SET_BOOK_FRIENDS', payload: updatedBookFriends });
        }
      }
      
      // Create BookFriend object
      const bookFriend: BookFriend = {
        id: selectedUser.id,
        name: selectedUser.name,
        email: selectedUser.email,
        role: 'author'
      };
      
      // Assign user to page
      handleAssignUser(bookFriend);
      setFindFriendsDialogOpen(false);
      setOpen(false);
    } catch (error) {
      console.error('Error selecting friend:', error);
    }
  };

  const handleInvite = async (name: string, email: string) => {
    if (isCoverPage) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const requestBody: { name: string; email: string; bookId: number } = { name, email, bookId };
      
      const response = await fetch(`${apiUrl}/invitations/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const result = await response.json();
        const newUser = result.user;
        
        if (newUser) {
          // Refresh bookFriends list and update editor context
          const friendsResponse = await fetch(`${apiUrl}/books/${bookId}/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (friendsResponse.ok) {
            const bookFriends = await friendsResponse.json();
            // Update editor context with new bookFriends
            dispatch({ type: 'SET_BOOK_FRIENDS', payload: bookFriends });
            
            // Create BookFriend object from the new user
            const newBookFriend: BookFriend = {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: 'author' // Default role for invited users
            };
            
            // Save page assignment to database immediately
            const assignmentResponse = await fetch(`${apiUrl}/page-assignments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                pageNumber: currentPage,
                userId: newUser.id,
                bookId: bookId
              })
            });
            
            if (assignmentResponse.ok) {
              // Update local state with the assignment
              const updatedAssignments = { ...editorState.pageAssignments };
              updatedAssignments[currentPage] = newBookFriend;
              dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: updatedAssignments });
              
              // Also call onAssignUser to update parent component
              onAssignUser(newBookFriend);
              
              // Show toast notification
              toast.success(`Page ${currentPage} assigned to ${newBookFriend.name}`);
            } else {
              console.error('Failed to assign page to new user');
            }
          }
        }
        
        setInviteDialogOpen(false);
      } else {
        const error = await response.json();
        console.error('Error inviting user:', error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      // TODO: Show error message to user
    }
  };

  const assignedUser = editorState.pageAssignments[currentPage];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" side="bottom">
        <div className="space-y-2 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-6 w-6"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium px-2 py-1 pr-8">
            Assign Page {currentPage}
          </div>
          
          {isCoverPage ? (
            <div className="text-sm text-muted-foreground px-2 py-3">
              Cover pages cannot be assigned to collaborators.
            </div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {allFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                      assignedUser?.id === friend.id ? 'bg-primary/10' : 'hover:bg-secondary'
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
                      <>
                        <Tooltip side="right" content="Remove Assignment">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignUser(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                ))}
                {allFriends.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No friends in this book
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="default"
                  className="flex-1"
                  disabled={isCoverPage}
                  onClick={() => {
                    if (isCoverPage) return;
                    setFindFriendsDialogOpen(true);
                  }}
                >
                  <Plus className="h-4" />
                  <span className="ml-2">Add</span>
                </Button>
                <Button
                  variant="highlight"
                  size="default"
                  className="flex-1 "
                  disabled={isCoverPage}
                  onClick={() => {
                    if (isCoverPage) return;
                    setInviteDialogOpen(true);
                  }}
                >
                  <Send className="h-4" /> 
                  <span className="ml-2">Invite</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
      />
      <SelectFriendDialog
        open={findFriendsDialogOpen}
        onOpenChange={setFindFriendsDialogOpen}
        onSelectFriend={handleSelectFriend}
        excludeUserIds={bookFriends.map(f => f.id)}
      />
    </Popover>
  );
}