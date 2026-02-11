import { useEditor } from '../../../../context/editor-context';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { CircleUser } from 'lucide-react';
import ProfilePicture from '../../users/profile-picture';
import PageAssignmentPopover from './page-assignment-popover';

// Helper function to get consistent color from name (same as in profile-picture.tsx)
function getConsistentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '3b82f6', '8b5cf6', 'ef4444', '10b981', 'f59e0b', 'ec4899', '06b6d4', 'f97316',
    'f87171', 'fb7185', 'f472b6', 'e879f9', 'c084fc', 'a78bfa', '8b5cf6', '7c3aed',
    '6366f1', '4f46e5', '3b82f6', '2563eb', '0ea5e9', '0891b2', '0e7490', '0f766e',
    '059669', '047857', '065f46', '166534', '15803d', '16a34a', '22c55e', '4ade80',
    '65a30d', '84cc16', 'a3e635', 'bef264', 'eab308', 'f59e0b', 'f97316', 'ea580c',
    'dc2626', 'b91c1c', '991b1b', '7f1d1d', '78716c', '57534e', '44403c', '292524'
  ];
  return colors[Math.abs(hash) % colors.length];
}

interface PageAssignmentButtonProps {
  currentPage: number;
  bookId: number;
}

export function PageAssignmentButton({ currentPage, bookId }: PageAssignmentButtonProps) {
  const { state, dispatch, canEditBookSettings } = useEditor();
  const assignedUser = state.pageAssignments[currentPage];
  const canManageAssignments = canEditBookSettings();

  const handleAssignUser = (user: User | null) => {
    const updatedAssignments = { ...state.pageAssignments };
    if (user) {
      updatedAssignments[currentPage] = user;
    } else {
      delete updatedAssignments[currentPage];
    }
    dispatch({
      type: 'UPDATE_PAGE_ASSIGNMENTS',
      payload: {
        assignments: updatedAssignments,
        actionName: user ? 'Assign Page' : 'Remove Page Assignment'
      }
    });
  };

  // Force re-render when assignments change
  const assignmentKey = `${currentPage}-${assignedUser?.id || 'none'}`;

  if (assignedUser) {
    if (!canManageAssignments) {
      return (
        <Tooltip content={`Assigned to ${assignedUser.name}`} side="bottom_editor_bar"backgroundColor="bg-background"textColor="text-foreground">
          <div className="p-0 rounded-full"key={assignmentKey}>
            <ProfilePicture name={assignedUser.name} size="sm"userId={assignedUser.id} variant='withColoredBorder' className='' />
          </div>
        </Tooltip>
      );
    }
    return (
      <Tooltip
        content={
          <>
            Assigned to {assignedUser.name} - Click to reassign
          </>
        }
        side="bottom_editor_bar"
        // backgroundColor={`#${getConsistentColor(assignedUser.name)}`}
        // textColor="#ffffff"
      >
        <PageAssignmentPopover
          currentPage={currentPage}
          bookId={bookId}
          onAssignUser={handleAssignUser}
        >
          <Button
            variant="ghost"
            size="xs"
            className="p-0 pt-0.5 rounded-full"
            key={assignmentKey}
          >
            <ProfilePicture name={assignedUser.name} size="sm"userId={assignedUser.id} variant='withColoredBorder' className='h-full w-full hover:ring hover:ring-4 hover:ring-highlight' />
          </Button>
        </PageAssignmentPopover>
      </Tooltip>
    );
  }

  if (!canManageAssignments) {
    return (
      <Tooltip content="Assign user to page"side="bottom_editor_bar"backgroundColor="bg-background"textColor="text-foreground">
        <div className="p-0 rounded-full">
          <CircleUser className="rounded-full  stroke-highlight"/>
        </div>
      </Tooltip>
    );
  }

  return (
    <PageAssignmentPopover
      currentPage={currentPage}
      bookId={bookId}
      onAssignUser={handleAssignUser}
    >
      <Button
        variant="ghost"
        size="md"
        className="p-0 pt-0.5 rounded-full"
        title="Assign user to page"
      >
        <CircleUser className="rounded-full  stroke-highlight hover:bg-highlight hover:stroke-background transition-all duration-300 ease-in-out h-full w-full"/>
      </Button>
    </PageAssignmentPopover>
  );
}