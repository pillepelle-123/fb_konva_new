import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, CirclePlus, CircleMinus, RotateCcw, Delete } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { ButtonGroup } from '../../../ui/composites/button-group';
import { CreatableCombobox } from '../../../ui/primitives/creatable-combobox';
import InviteUserDialog from '../invite-user-dialog';
import ProfilePicture from '../../users/profile-picture';
import { cn } from '../../../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/overlays/dialog';
import {
  type Friend,
  type InviteDraft,
  type WizardState,
  DEFAULT_ASSIGNMENT_PAGE_COUNT,
  getDefaultTeamAssignmentState,
  type TeamAssignmentState,
} from './types';
import { getConsistentColor } from '../../../../utils/consistent-color';

type PageType =
  | 'back-cover'
  | 'front-cover'
  | 'inner-front-left'
  | 'inner-front-right'
  | 'content'
  | 'inner-back';

interface PageInfo {
  pageNumber: number;
  type: PageType;
  canAssignUser: boolean;
}

type PageTile = {
  page: PageInfo;
  assignedFriend?: Friend;
  chunkStartPage: number | null;
};

interface TeamStepProps {
  wizardState: WizardState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  availableFriends: Friend[];
}

const CONTENT_START_PAGE = 5;

// Helper function to ensure totalPages is always even
function ensureEvenTotalPages(totalPages: number): number {
  return totalPages % 2 === 0 ? totalPages : totalPages + 1;
}

export function TeamStep({ wizardState, onTeamChange, availableFriends }: TeamStepProps) {
  const [activeDraggedFriendId, setActiveDraggedFriendId] = useState<number | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');
  const [initialName, setInitialName] = useState('');
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);
  const [showResetAssignmentDialog, setShowResetAssignmentDialog] = useState(false);
  const [showResetAddedPagesDialog, setShowResetAddedPagesDialog] = useState(false);

  const assignmentState =
    wizardState.team.assignmentState ?? getDefaultTeamAssignmentState();
  const selectedFriends = wizardState.team.selectedFriends;
  const pagesPerUser = wizardState.team.pagesPerUser;

  useEffect(() => {
    if (!wizardState.team.assignmentState) {
      onTeamChange({ assignmentState: getDefaultTeamAssignmentState() });
    }
  }, [wizardState.team.assignmentState, onTeamChange]);

  // Ensure totalPages is always even
  const totalPages = ensureEvenTotalPages(Math.max(assignmentState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT));
  const assignablePageCount = Math.max(totalPages - CONTENT_START_PAGE, 0);
  const assignableBlocksCount = Math.floor(assignablePageCount / pagesPerUser);
  const extraPages = Math.max(totalPages - DEFAULT_ASSIGNMENT_PAGE_COUNT, 0);

  const pageTiles = useMemo<PageTile[]>(() => {
    const tiles: PageTile[] = [];
    // Add pages 1-3 (not assignable)
    for (let pageNumber = 1; pageNumber <= 3; pageNumber++) {
      const page: PageInfo = {
        pageNumber,
        type: getPageType(pageNumber, totalPages),
        canAssignUser: false,
      };
      tiles.push({ page, assignedFriend: undefined, chunkStartPage: null });
    }
    // Add page 4 (assignable)
    const page4: PageInfo = {
      pageNumber: 4,
      type: getPageType(4, totalPages),
      canAssignUser: true,
    };
    const friendId4 = assignmentState.pageAssignments[4];
    const assignedFriend4 = friendId4
      ? selectedFriends.find((friend) => friend.id === friendId4)
      : undefined;
    let chunkStartPage4: number | null = null;
    if (friendId4) {
      let start = 4;
      // Check backwards to find the start of the chunk
      // Page 3 is not assignable, so we can't go before 4
      // But we need to check if page 5+ is also assigned to the same friend
      // If so, we need to find the actual start by checking backwards from those pages
      // For now, start at 4 and check if there are consecutive pages after
      let currentPage = 4;
      while (currentPage < totalPages && assignmentState.pageAssignments[currentPage] === friendId4) {
        currentPage++;
      }
      // Now go backwards from the last page in the chunk to find the start
      start = currentPage - 1;
      while (
        start - 1 >= 4 &&
        assignmentState.pageAssignments[start - 1] === friendId4
      ) {
        start--;
      }
      chunkStartPage4 = start;
    }
    tiles.push({ page: page4, assignedFriend: assignedFriend4, chunkStartPage: chunkStartPage4 });
    // Add content pages (5 to totalPages - 1, assignable)
    for (let pageNumber = CONTENT_START_PAGE; pageNumber < totalPages; pageNumber++) {
      const page: PageInfo = {
        pageNumber,
        type: getPageType(pageNumber, totalPages),
        canAssignUser: pageNumber < totalPages,
      };
      const friendId = assignmentState.pageAssignments[pageNumber];
      const assignedFriend = friendId
        ? selectedFriends.find((friend) => friend.id === friendId)
        : undefined;
      let chunkStartPage: number | null = null;
      if (friendId) {
        let start = pageNumber;
        // Check backwards to find the start of the chunk (including page 4)
        while (
          start - 1 >= 4 &&
          assignmentState.pageAssignments[start - 1] === friendId
        ) {
          start--;
        }
        chunkStartPage = start;
      }
      tiles.push({ page, assignedFriend, chunkStartPage });
    }
    // Add last page (not assignable)
    if (totalPages > 4) {
      const page: PageInfo = {
        pageNumber: totalPages,
        type: getPageType(totalPages, totalPages),
        canAssignUser: false,
      };
      tiles.push({ page, assignedFriend: undefined, chunkStartPage: null });
    }
    return tiles;
  }, [assignmentState.pageAssignments, selectedFriends, totalPages]);
  const assignedBlocksCount = useMemo(() => {
    const assignments = assignmentState.pageAssignments;
    const sortedPages = Object.keys(assignments)
      .map(Number)
      .sort((a, b) => a - b);
    let count = 0;
    sortedPages.forEach((page) => {
      const friendId = assignments[page];
      const prevFriendId = assignments[page - 1];
      if (friendId && friendId !== prevFriendId) {
        count += 1;
      }
    });
    return count;
  }, [assignmentState.pageAssignments]);

  // Check if a friend is already assigned to any page
  const isFriendAssigned = useMemo(() => {
    const assignedFriendIds = new Set(Object.values(assignmentState.pageAssignments));
    return (friendId: number) => assignedFriendIds.has(friendId);
  }, [assignmentState.pageAssignments]);

  const friendOptions = useMemo(() => {
    const selectedIds = new Set(selectedFriends.map((friend) => friend.id));
    return availableFriends
      .filter((friend) => !selectedIds.has(friend.id))
      .map((friend) => ({
        value: String(friend.id),
        label: friend.name,
        description: friend.email,
        userId: friend.id,
      }));
  }, [availableFriends, selectedFriends]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeDraggedFriend = selectedFriends.find(
    (friend) => friend.id === activeDraggedFriendId,
  );

  const handleSelectFriend = (value?: string) => {
    if (!value) return;
    const friendId = Number(value);
    const friend = availableFriends.find((item) => item.id === friendId);
    if (!friend) return;
    if (selectedFriends.some((existing) => existing.id === friend.id)) return;
    onTeamChange({
      selectedFriends: [...selectedFriends, friend],
    });
  };

  const handleCreateFriend = (input: string) => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      setInitialEmail(trimmed);
      setInitialName('');
    } else {
      setInitialEmail('');
      setInitialName(trimmed);
    }
    setInviteError(undefined);
    setInviteDialogOpen(true);
  };

  const handleInviteFriend = (name: string, email: string) => {
    const tempFriendId = -Math.abs(Date.now());
    const newFriend: Friend = {
      id: tempFriendId,
      name,
      email,
    };
    const newInvite: InviteDraft = {
      id: uuidv4(),
      name,
      email,
      tempFriendId,
    };
    onTeamChange({
      selectedFriends: [...selectedFriends, newFriend],
      invites: [...wizardState.team.invites, newInvite],
    });
    setInviteError(undefined);
    setInviteDialogOpen(false);
  };

  const removeFriend = (friendId: number) => {
    const updatedFriends = selectedFriends.filter((friend) => friend.id !== friendId);
    const updatedInvites = wizardState.team.invites.filter(
      (invite) => invite.tempFriendId !== friendId,
    );
    const clearedAssignments = clearAssignmentsForFriend(assignmentState, friendId);
    onTeamChange({
      selectedFriends: updatedFriends,
      invites: updatedInvites,
      assignmentState: clearedAssignments,
    });
  };

  const handlePageCountChange = (value: 1 | 2 | 3 | 4) => {
    const nextFacing = value % 2 === 0 ? wizardState.team.friendFacingPages : false;
    const oldPagesPerUser = pagesPerUser;
    
    // Adjust assignments instead of resetting
    const adjustedState = adjustAssignmentsForPageCountChange(
      assignmentState,
      oldPagesPerUser,
      value,
      totalPages
    );
    
    onTeamChange({
      pagesPerUser: value,
      friendFacingPages: nextFacing,
      assignmentState: adjustedState,
    });
  };

  const handleFacingPagesToggle = (checked: boolean) => {
    if (pagesPerUser % 2 !== 0) return;
    
    // Adjust assignments to ensure they're within page pairs when enabling facing pages
    const adjustedState = checked
      ? adjustAssignmentsForFacingPages(assignmentState, pagesPerUser, totalPages)
      : assignmentState; // When disabling, keep assignments as is
    
    onTeamChange({
      friendFacingPages: checked,
      assignmentState: adjustedState,
    });
  };

  const handleAutoAssign = () => {
    if (selectedFriends.length === 0) {
      toast.error('No collaborators selected. Please add collaborators first.');
      return;
    }
    const startPage = wizardState.team.friendFacingPages ? CONTENT_START_PAGE : 4;
    const nextState = buildAutoAssignmentState(assignmentState, selectedFriends, pagesPerUser, startPage);
    onTeamChange({ assignmentState: nextState });
    toast.success(`Assigned ${selectedFriends.length} collaborator${selectedFriends.length > 1 ? 's' : ''} to pages.`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const friendId = event.active.data.current?.friendId as number | undefined;
    if (friendId !== undefined) {
      setActiveDraggedFriendId(friendId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveDraggedFriendId(null);
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'collaborator' && overType === 'collaborator') {
      const activeId = active.data.current?.friendId;
      const overId = over.data.current?.friendId;
      const oldIndex = selectedFriends.findIndex((friend) => friend.id === activeId);
      const newIndex = selectedFriends.findIndex((friend) => friend.id === overId);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(selectedFriends, oldIndex, newIndex);
        onTeamChange({ selectedFriends: reordered });
      }
    }

    if (activeType === 'collaborator' && overType === 'page') {
      const friendId = active.data.current?.friendId as number;
      const pageNumber = over.data.current?.pageNumber as number | undefined;
      
      // Check if friend is already assigned
      if (isFriendAssigned(friendId)) {
        toast.error('This collaborator is already assigned to pages. Each collaborator can only be assigned once.');
        setActiveDraggedFriendId(null);
        return;
      }

      if (pageNumber !== undefined) {
        let startPage = pageNumber;
        // Special handling for pagesPerUser === 4 and friendFacingPages === true
        if (
          wizardState.team.friendFacingPages &&
          pagesPerUser === 4 &&
          startPage % 2 === 0 &&
          startPage !== 4 // Don't adjust page 4
        ) {
          // For even pages, assign the 4 pages surrounding it: one preceding and two succeeding
          // e.g., if dropped on page 6, assign pages 5, 6, 7, 8
          startPage = startPage - 1;
        } else if (
          wizardState.team.friendFacingPages &&
          pagesPerUser % 2 === 0 &&
          pagesPerUser !== 4 &&
          startPage % 2 === 0 &&
          startPage !== 4 // Don't adjust page 4
        ) {
          // For other even page settings (e.g., pagesPerUser === 2), adjust to previous odd page
          startPage = Math.max(startPage - 1, CONTENT_START_PAGE);
        }
        
        // Check if there's enough space for the assignment
        // If not enough space, automatically add pages as needed
        const hasEnoughSpace = checkAssignmentSpace(startPage, friendId, pagesPerUser);
        if (!hasEnoughSpace) {
          // Check if the issue is just missing pages (not conflicting assignments)
          const isJustMissingPages = (() => {
            for (let offset = 0; offset < pagesPerUser; offset++) {
              const pageNumber = startPage + offset;
              if (pageNumber >= totalPages) {
                // This page doesn't exist yet - we can add it
                continue;
              }
              const assignedFriendId = assignmentState.pageAssignments[pageNumber];
              // If page exists and is assigned to a different friend, we can't add pages to fix this
              if (assignedFriendId !== undefined && assignedFriendId !== friendId) {
                return false;
              }
            }
            return true;
          })();
          
          if (isJustMissingPages) {
            // Automatically add pages as needed
            const requiredLastPage = startPage + pagesPerUser - 1;
            const pagesNeeded = Math.max(0, requiredLastPage - totalPages + 1);
            if (pagesNeeded > 0) {
              const pairsToAdd = Math.ceil(pagesNeeded / 2);
              const newTotalPages = ensureEvenTotalPages(Math.min(totalPages + (pairsToAdd * 2), 96));
              const nextState = {
                ...assignmentState,
                totalPages: newTotalPages,
              };
              onTeamChange({ assignmentState: nextState });
              // Now assign the pages
              handleAssignPages(friendId, startPage);
              setActiveDraggedFriendId(null);
              return;
            }
          } else {
            // There are conflicting assignments - show error
            const friend = selectedFriends.find((f) => f.id === friendId);
            const friendName = friend?.name || 'This collaborator';
            toast.error(
              `Cannot assign ${friendName} to page ${startPage}. Not enough consecutive pages available. ${pagesPerUser} pages are required, but some of the required pages are already assigned to other collaborators.`
            );
            setActiveDraggedFriendId(null);
            return;
          }
        }
        
        handleAssignPages(friendId, startPage);
      }
    }

    setActiveDraggedFriendId(null);
  };

  const handleDragCancel = () => {
    setActiveDraggedFriendId(null);
  };

  // Check if there's enough consecutive space for assignment
  const checkAssignmentSpace = (startPage: number, friendId: number, pagesPerUser: number): boolean => {
    // Allow page 4, otherwise normalize to CONTENT_START_PAGE
    const normalizedStart = startPage === 4 ? 4 : Math.max(startPage, CONTENT_START_PAGE);
    for (let offset = 0; offset < pagesPerUser; offset++) {
      const pageNumber = normalizedStart + offset;
      if (pageNumber >= totalPages) {
        return false; // Page exceeds total pages
      }
      const assignedFriendId = assignmentState.pageAssignments[pageNumber];
      // If page is assigned to a different friend, there's not enough space
      if (assignedFriendId !== undefined && assignedFriendId !== friendId) {
        return false;
      }
    }
    return true;
  };

  const handleAssignPages = (friendId: number, startPage: number) => {
    const nextState = assignPagesToFriend(assignmentState, startPage, friendId, pagesPerUser);
    onTeamChange({ assignmentState: nextState });
  };

  const handleClearAssignment = (startPage: number) => {
    const nextState = clearAssignmentChunk(assignmentState, startPage, pagesPerUser);
    if (nextState !== assignmentState) {
      onTeamChange({ assignmentState: nextState });
    }
  };

  const handleAddPages = () => {
    const MAX_PAGES = 96;
    if (totalPages >= MAX_PAGES) {
      toast.error(`Maximum page count of ${MAX_PAGES} reached`);
      return;
    }
    const newTotalPages = ensureEvenTotalPages(Math.min(totalPages + 2, MAX_PAGES));
    const nextState = {
      ...assignmentState,
      totalPages: newTotalPages,
    };
    onTeamChange({ assignmentState: nextState });
  };

  const handleRemovePages = (pageNumber: number) => {
    // Remove 2 pages starting from the page pair that contains this page
    // If pageNumber is odd, remove the pair starting from pageNumber
    // If pageNumber is even, remove the pair starting from pageNumber - 1
    const pairStart = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
    const pagesToRemove = [pairStart, pairStart + 1];
    
    // Clear ALL assignments on these pages (including if multiple users are assigned)
    const updatedAssignments = { ...assignmentState.pageAssignments };
    pagesToRemove.forEach(page => {
      delete updatedAssignments[page];
    });
    
    // Remove pages that are after the removed pages and shift them down by 2
    const newAssignments: Record<number, number> = {};
    Object.entries(updatedAssignments).forEach(([page, friendId]) => {
      const pageNum = Number(page);
      if (pageNum < pairStart) {
        // Keep pages before the removed pair
        newAssignments[pageNum] = friendId;
      } else if (pageNum > pairStart + 1) {
        // Shift pages after the removed pair down by 2
        newAssignments[pageNum - 2] = friendId;
      }
      // Pages in the removed pair (pairStart, pairStart + 1) are not added to newAssignments
    });
    
    const newTotalPages = Math.max(totalPages - 2, DEFAULT_ASSIGNMENT_PAGE_COUNT);
    const nextState = {
      ...assignmentState,
      totalPages: newTotalPages,
      pageAssignments: newAssignments,
    };
    onTeamChange({ assignmentState: nextState });
  };

  const handleResetAssignment = () => {
    const nextState = {
      ...assignmentState,
      pageAssignments: {},
    };
    onTeamChange({ assignmentState: nextState });
    setShowResetAssignmentDialog(false);
    toast.success('All page assignments have been reset.');
  };

  const handleResetAddedPages = () => {
    // Remove all pages beyond DEFAULT_ASSIGNMENT_PAGE_COUNT
    const newTotalPages = DEFAULT_ASSIGNMENT_PAGE_COUNT;
    
    // Find all users who have assignments on additional pages (pages > DEFAULT_ASSIGNMENT_PAGE_COUNT)
    const usersWithAdditionalPageAssignments = new Set<number>();
    Object.entries(assignmentState.pageAssignments).forEach(([page, friendId]) => {
      const pageNum = Number(page);
      if (pageNum > DEFAULT_ASSIGNMENT_PAGE_COUNT) {
        usersWithAdditionalPageAssignments.add(friendId);
      }
    });
    
    // Check for integrity: if a user has assignments that include the last regular page (which becomes unassignable),
    // remove ALL their assignments to maintain chunk integrity
    const lastRegularPage = DEFAULT_ASSIGNMENT_PAGE_COUNT;
    const usersToRemoveCompletely = new Set<number>();
    
    // Find all users who have assignments on the last regular page
    // These users' assignments will be broken because the last page becomes unassignable
    Object.entries(assignmentState.pageAssignments).forEach(([page, friendId]) => {
      const pageNum = Number(page);
      if (pageNum === lastRegularPage) {
        // This user has an assignment on the last regular page, which becomes unassignable
        // Remove ALL their assignments to maintain chunk integrity
        usersToRemoveCompletely.add(friendId);
      }
    });
    
    // Also remove all users who have assignments on additional pages
    // (They already have their assignments on additional pages removed, but we also remove their regular assignments
    //  to be consistent with the previous behavior, unless they're already in usersToRemoveCompletely)
    usersWithAdditionalPageAssignments.forEach(friendId => {
      usersToRemoveCompletely.add(friendId);
    });
    
    // Clear ALL assignments for users who should be removed completely
    // This includes both additional pages AND regular pages for those users
    const newAssignments: Record<number, number> = {};
    Object.entries(assignmentState.pageAssignments).forEach(([page, friendId]) => {
      const pageNum = Number(page);
      // Only keep assignments for users who:
      // 1. Are not in the usersToRemoveCompletely set
      // 2. Are on pages that are not being removed (pageNum <= DEFAULT_ASSIGNMENT_PAGE_COUNT)
      // 3. Are not on the last regular page (which becomes unassignable)
      if (
        pageNum < DEFAULT_ASSIGNMENT_PAGE_COUNT && // Not the last regular page (becomes unassignable)
        !usersToRemoveCompletely.has(friendId)
      ) {
        newAssignments[pageNum] = friendId;
      }
      // All assignments for users in usersToRemoveCompletely are removed (both additional and regular)
      // All assignments on pages > DEFAULT_ASSIGNMENT_PAGE_COUNT are removed
      // All assignments on the last regular page (DEFAULT_ASSIGNMENT_PAGE_COUNT) are removed (becomes unassignable)
    });
    
    const nextState = {
      ...assignmentState,
      totalPages: newTotalPages,
      pageAssignments: newAssignments,
    };
    onTeamChange({ assignmentState: nextState });
    setShowResetAddedPagesDialog(false);
    toast.success('All added pages have been removed.');
  };

  const handleRemoveUnassignedPages = () => {
    // Iteratively remove unassigned page pairs from the end
    // We need to iterate because removing pairs shifts page numbers,
    // potentially creating new removable pairs
    let updatedAssignments = { ...assignmentState.pageAssignments };
    let newTotalPages = totalPages;
    let removedPairsCount = 0;
    let hasRemoved = true;
    
    // Keep removing pairs until no more can be removed
    while (hasRemoved) {
      hasRemoved = false;
      
      // Start from the last possible pair (work backwards)
      // Ensure we start with an odd page number (first page of a pair)
      let pairStart = newTotalPages - 1;
      if (pairStart % 2 === 0) {
        pairStart -= 1;
      }
      
      // Check pairs from the end backwards
      while (pairStart > DEFAULT_ASSIGNMENT_PAGE_COUNT) {
        const pairEnd = pairStart + 1;
        
        // Check if both pages in the pair have no assignment
        const hasAssignmentOnPairStart = updatedAssignments[pairStart] !== undefined;
        const hasAssignmentOnPairEnd = updatedAssignments[pairEnd] !== undefined;
        
        if (!hasAssignmentOnPairStart && !hasAssignmentOnPairEnd) {
          // Both pages are unassigned, check if we can safely remove this pair
          // Calculate the new total pages after removal
          const newTotalPagesAfterRemoval = Math.max(newTotalPages - 2, DEFAULT_ASSIGNMENT_PAGE_COUNT);
          const newLastPage = newTotalPagesAfterRemoval;
          
          // Check if removing this pair would cause an assigned page to become the last (unassignable) page
          // We need to check pages that would shift to become the new last page
          let wouldBreakIntegrity = false;
          
          // Check if any page that would become the new last page has an assignment
          for (const [page, friendId] of Object.entries(updatedAssignments)) {
            const pageNum = Number(page);
            let wouldBecomeLastPage = false;
            
            if (pageNum > pairEnd) {
              // This page will shift down by 2
              const newPageNum = pageNum - 2;
              if (newPageNum === newLastPage) {
                wouldBecomeLastPage = true;
              }
            } else if (pageNum < pairStart && pageNum === newLastPage) {
              // This page doesn't shift, but it would become the last page
              wouldBecomeLastPage = true;
            }
            
            if (wouldBecomeLastPage) {
              // Check if this user has other assignments that would remain
              const userHasOtherAssignments = Object.entries(updatedAssignments).some(([p, fId]) => {
                const pNum = Number(p);
                return fId === friendId && pNum !== pageNum && pNum < pairStart;
              });
              if (userHasOtherAssignments) {
                // Removing this pair would break integrity - this user would have some pages assigned
                // but one page on the unassignable last page
                wouldBreakIntegrity = true;
                break;
              }
            }
          }
          
          if (wouldBreakIntegrity) {
            // Cannot remove this pair without breaking assignment integrity
            // Skip this pair and continue with the previous one
            pairStart -= 2;
            continue;
          }
          
          // Safe to remove this pair
          // Shift all assignments after this pair down by 2
          const shiftedAssignments: Record<number, number> = {};
          Object.entries(updatedAssignments).forEach(([page, friendId]) => {
            const pageNum = Number(page);
            if (pageNum < pairStart) {
              // Keep pages before the removed pair
              shiftedAssignments[pageNum] = friendId;
            } else if (pageNum > pairEnd) {
              // Shift pages after the removed pair down by 2
              shiftedAssignments[pageNum - 2] = friendId;
            }
            // Pages in the removed pair are not added
          });
          
          updatedAssignments = shiftedAssignments;
          newTotalPages = newTotalPagesAfterRemoval;
          removedPairsCount++;
          hasRemoved = true;
          
          // After removing a pair, restart from the new end
          break;
        }
        
        // Move to previous pair
        pairStart -= 2;
      }
    }
    
    if (removedPairsCount === 0) {
      toast.info('No unassigned page pairs found to remove.');
      return;
    }
    
    const nextState = {
      ...assignmentState,
      totalPages: ensureEvenTotalPages(newTotalPages),
      pageAssignments: updatedAssignments,
    };
    onTeamChange({ assignmentState: nextState });
    toast.success(`Removed ${removedPairsCount} unassigned page pair${removedPairsCount > 1 ? 's' : ''}.`);
  };


  return (
    <div className="h-full flex flex-col min-h-0">
      {/* <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Team & Content</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Organise your collaborators and assign pages.
            </p>
          </div>
          {selectedFriends.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleResetCollaborators}>
              Reset
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pages per Person</p>
            <p className="text-lg font-semibold">{pagesPerUser}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Facing Pages</p>
            <p className="text-lg font-semibold">
              {wizardState.team.friendFacingPages && pagesPerUser % 2 === 0 ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Extra Pages</p>
            <p className="text-lg font-semibold">+{extraPages}</p>
          </div>
        </div>
      </div> */}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid gap-6 lg:grid-cols-[320px_auto] flex-1 min-h-0 items-stretch mb-6">
          <div className="flex flex-col min-h-0 h-full">
            <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4 flex flex-col overflow-y-auto flex-1 min-h-0">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold">Invite collaborators</p>
                  {availableFriends.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedIds = new Set(selectedFriends.map((friend) => friend.id));
                        const friendsToAdd = availableFriends.filter(
                          (friend) => !selectedIds.has(friend.id)
                        );
                        if (friendsToAdd.length > 0) {
                          onTeamChange({
                            selectedFriends: [...selectedFriends, ...friendsToAdd],
                          });
                        }
                      }}
                      disabled={availableFriends.every((friend) =>
                        selectedFriends.some((selected) => selected.id === friend.id)
                      )}
                      className="text-xs"
                    >
                      Add all friends
                    </Button>
                  )}
                </div>
                <CreatableCombobox
                  options={friendOptions}
                  value={undefined}
                  onChange={handleSelectFriend}
                  onCreateOption={handleCreateFriend}
                  placeholder="Search or invite friend..."
                  inputPlaceholder="Search friends..."
                  emptyLabel="No friends found"
                  allowClear={false}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Selected collaborators
                </p>
                <div className="max-h-64 overflow-y-auto pr-1">
                  {selectedFriends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No collaborators selected yet.</p>
                  ) : (
                    <SortableContext
                      items={selectedFriends.map((friend) => friend.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-4 gap-1">
                        {selectedFriends.map((friend) => (
                          <CollaboratorDraggableCard
                            key={friend.id}
                            friend={friend}
                            onRemove={removeFriend}
                            isActive={activeDraggedFriendId === friend.id}
                            disableDrag={isFriendAssigned(friend.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold">Pages per collaborator</p>
                    <p className="text-xs text-muted-foreground">Choose how many pages each drop assigns.</p>
                  </div>
                  <ButtonGroup>
                    {[1, 2, 3, 4].map((n) => (
                      <Button
                        key={n}
                        variant={pagesPerUser === n ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageCountChange(n as 1 | 2 | 3 | 4)}
                      >
                        {n}
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
                <div className="grid gap-3">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={wizardState.team.friendFacingPages}
                      onChange={(event) => handleFacingPagesToggle(event.target.checked)}
                      disabled={pagesPerUser % 2 !== 0}
                    />
                    <span className="text-sm">
                      Facing Pages
                      <span className="block text-xs text-muted-foreground">
                        Assign complete spreads (requires an even pages-per-user value).
                      </span>
                    </span>
                  </label>
                  <div className="flex gap-2 w-full">
                    <Tooltip content="Remove all page assignments from collaborators." side="bottom">
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowResetAssignmentDialog(true)}
                          disabled={Object.keys(assignmentState.pageAssignments).length === 0}
                          className="w-full"
                        >
                          Reset Assignment
                        </Button>
                      </div>
                    </Tooltip>
                    <Tooltip content="Automatically distribute all collaborators to pages in above order." side="bottom">
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="highlight"
                          size="sm"
                          onClick={handleAutoAssign}
                          disabled={selectedFriends.length === 0}
                          className="w-full"
                        >
                          Auto-assign
                        </Button>
                      </div>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="rounded-lg border bg-white p-4 shadow-inner flex flex-col flex-1 min-h-0 overflow-hidden">
              <BookTimeline
                pageTiles={pageTiles}
                activeFriendId={activeDraggedFriendId}
                onClear={handleClearAssignment}
                onAddPages={handleAddPages}
                onRemovePages={handleRemovePages}
                totalPages={totalPages}
                assignablePageCount={assignablePageCount}
                extraPages={extraPages}
                assignableBlocksCount={assignableBlocksCount}
                assignedBlocksCount={assignedBlocksCount}
                pagesPerUser={pagesPerUser}
                friendFacingPages={wizardState.team.friendFacingPages}
                assignmentState={assignmentState}
                onTeamChange={onTeamChange}
                onShowRemoveAddedPagesDialog={() => setShowResetAddedPagesDialog(true)}
                pageAssignments={assignmentState.pageAssignments}
                onRemoveUnassignedPages={handleRemoveUnassignedPages}
              />
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDraggedFriend && (
            <CollaboratorDragPreview friend={activeDraggedFriend} />
          )}
        </DragOverlay>
      </DndContext>

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

      {/* Reset Assignment Confirmation Dialog */}
      <Dialog open={showResetAssignmentDialog} onOpenChange={setShowResetAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all page assignments? This will unassign all collaborators from their pages, but the pages themselves will remain.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetAssignment}>
              Reset Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Added Pages Confirmation Dialog */}
      <Dialog open={showResetAddedPagesDialog} onOpenChange={setShowResetAddedPagesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Added Pages</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all added pages? This will remove all pages beyond the default page count and also remove any page assignments on those pages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetAddedPagesDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetAddedPages}>
              Remove Added Pages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CollaboratorDraggableCardProps {
  friend: Friend;
  onRemove: (friendId: number) => void;
  isActive: boolean;
  disableDrag?: boolean;
  hideRemove?: boolean;
}

function CollaboratorDraggableCard({
  friend,
  onRemove,
  isActive,
  disableDrag = false,
  hideRemove = false,
}: CollaboratorDraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: friend.id,
    data: {
      type: 'collaborator',
      friendId: friend.id,
    },
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Tooltip content={friend.name} side="bottom">
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'rounded-lg border-transparent bg-card flex items-center justify-center transition-colors min-h-[80px]',
          disableDrag 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-muted/50 cursor-grab active:cursor-grabbing',
          (isDragging || isActive) && 'ring-2 ring-primary/40 shadow-sm',
        )}
        {...attributes}
        {...(disableDrag ? {} : listeners)}
      >
        <div className="relative">
          <ProfilePicture
            name={friend.name}
            size="sm"
            userId={friend.id > 0 ? friend.id : undefined}
            editable={false}
            variant='withColoredBorder'
          />
          {!hideRemove && (
            <button
              onClick={disableDrag ? undefined : (e) => {
                e.stopPropagation();
                onRemove(friend.id);
              }}
              disabled={disableDrag}
              className={cn(
                "absolute -top-1 -right-1 transition-colors p-0.5 rounded-full bg-background/70 border border-border",
                disableDrag
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-background"
              )}
              aria-label={disableDrag ? `Cannot remove ${friend.name} - unassign first` : `Remove ${friend.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Tooltip>
  );
}

function CollaboratorDragPreview({ friend }: { friend: Friend }) {
  return (
    <div className="rounded-lg border bg-card shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-none min-w-[240px]">
      <ProfilePicture
        name={friend.name}
        size="sm"
        userId={friend.id > 0 ? friend.id : undefined}
        editable={false}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{friend.name}</p>
        {friend.email && <p className="text-xs text-muted-foreground truncate">{friend.email}</p>}
      </div>
    </div>
  );
}

interface BookTimelineProps {
  pageTiles: PageTile[];
  activeFriendId: number | null;
  onClear: (startPage: number) => void;
  onAddPages: () => void;
  onRemovePages: (pageNumber: number) => void;
  totalPages: number;
  assignablePageCount: number;
  extraPages: number;
  assignableBlocksCount: number;
  assignedBlocksCount: number;
  pagesPerUser: 1 | 2 | 3 | 4;
  friendFacingPages: boolean;
  maxPages?: number;
  assignmentState: TeamAssignmentState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  onShowRemoveAddedPagesDialog: () => void;
  pageAssignments: Record<number, number>;
  onRemoveUnassignedPages: () => void;
}

function BookTimeline({
  pageTiles,
  activeFriendId,
  onClear,
  onAddPages,
  onRemovePages,
  totalPages,
  assignablePageCount,
  extraPages,
  assignableBlocksCount,
  assignedBlocksCount,
  pagesPerUser,
  friendFacingPages,
  maxPages = 96,
  assignmentState,
  onTeamChange,
  onShowRemoveAddedPagesDialog: onShowRemoveAddedPagesDialog,
  pageAssignments,
  onRemoveUnassignedPages,
}: BookTimelineProps) {
  const orderedPageTiles = useMemo(
    () => [...pageTiles].sort((a, b) => a.page.pageNumber - b.page.pageNumber),
    [pageTiles],
  );
  const pagePairs = useMemo(() => {
    const pairs: PageTile[][] = [];
    for (let i = 0; i < orderedPageTiles.length; i += 2) {
      pairs.push(orderedPageTiles.slice(i, i + 2));
    }
    return pairs;
  }, [orderedPageTiles]);

  return (
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <div className="flex items-start justify-between gap-2 flex-wrap flex-shrink-0 mb-3">
        <div>
          <p className="text-sm font-semibold">Assignments</p>
          <p className="text-xs text-muted-foreground">
            {assignablePageCount} assignable pages • {assignableBlocksCount} bundles × {pagesPerUser} pages • {totalPages} pages total
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {assignedBlocksCount} bundles assigned · {Math.max(assignableBlocksCount - assignedBlocksCount, 0)} open
            {extraPages > 0 && (
            <span className="m-3 text-[11px] text-amber-600 border border-amber-200 rounded-full px-3 py-0.5 bg-amber-50">
              +{extraPages} extra pages
            </span>
          )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">

          <div className="flex gap-2">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={onAddPages}
              disabled={totalPages >= maxPages}
              title="Add 2 pages"
            >
              +2
            </Button> */}
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const MAX_PAGES = 96;
                if (totalPages + 4 > MAX_PAGES) {
                  toast.error(`Cannot add 4 pages. Maximum page count of ${MAX_PAGES} would be exceeded.`);
                  return;
                }
                const newTotalPages = ensureEvenTotalPages(Math.min(totalPages + 4, MAX_PAGES));
                const nextState = {
                  ...assignmentState,
                  totalPages: newTotalPages,
                };
                onTeamChange({ assignmentState: nextState });
              }}
              disabled={totalPages + 4 > maxPages}
              title="Add 4 pages"
            >
              +4
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const MAX_PAGES = 96;
                if (totalPages + 8 > MAX_PAGES) {
                  toast.error(`Cannot add 8 pages. Maximum page count of ${MAX_PAGES} would be exceeded.`);
                  return;
                }
                const newTotalPages = ensureEvenTotalPages(Math.min(totalPages + 8, MAX_PAGES));
                const nextState = {
                  ...assignmentState,
                  totalPages: newTotalPages,
                };
                onTeamChange({ assignmentState: nextState });
              }}
              disabled={totalPages + 8 > maxPages}
              title="Add 8 pages"
            >
              +8
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onRemoveUnassignedPages}
              disabled={totalPages <= DEFAULT_ASSIGNMENT_PAGE_COUNT}
              title="Remove unassigned page pairs"
              className="flex items-center gap-1.5"
            >
              <Delete className="h-4 w-4" />
              {/* <span>Remove unassigned pages</span> */}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onShowRemoveAddedPagesDialog}
              disabled={extraPages === 0}
              title="Remove added pages"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-1" style={{ height: 0 }}>
        <div className="flex flex-wrap gap-4">
          {pagePairs.map((pair, index) => (
            <div key={`pair-${index}`} className="flex gap-1">
              {pair.map(({ page, assignedFriend, chunkStartPage }) => (
                <PageAssignmentTile
                  key={page.pageNumber}
                  page={page}
                  assignedFriend={assignedFriend}
                  chunkStartPage={chunkStartPage}
                  onClear={onClear}
                  onRemovePages={onRemovePages}
                      activeFriendId={activeFriendId}
                      pagesPerUser={pagesPerUser}
                      friendFacingPages={friendFacingPages}
                      totalPages={totalPages}
                      pageAssignments={pageAssignments}
                />
              ))}
            </div>
          ))}
          {/* Add Pages Button Tile */}
          {totalPages < maxPages && (
            <div className="flex gap-1">
              <div className="flex flex-col text-xs" style={{ width: '50px' }}>
                <button
                  onClick={onAddPages}
                  className="rounded-xl border-4 border-dashed border-muted-foreground/10 bg-white flex flex-col items-center justify-center transition-all p-0.5 relative hover:bg-muted/50"
                  style={{
                    aspectRatio: '210 / 297',
                    width: '50px',
                  }}
                  title="Add 2 pages"
                >
                  <CirclePlus className="h-6 w-6 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface PageAssignmentTileProps {
  page: PageInfo;
  assignedFriend?: Friend;
  chunkStartPage: number | null;
  onClear: (startPage: number) => void;
  onRemovePages: (pageNumber: number) => void;
  activeFriendId: number | null;
  pagesPerUser: 1 | 2 | 3 | 4;
  friendFacingPages: boolean;
  totalPages: number;
  pageAssignments: Record<number, number>;
}

function PageAssignmentTile({
  page,
  assignedFriend,
  chunkStartPage,
  onClear,
  onRemovePages,
  activeFriendId,
  pagesPerUser,
  friendFacingPages,
  totalPages,
  pageAssignments,
}: PageAssignmentTileProps) {
  const color = assignedFriend ? getConsistentColor(assignedFriend.name) : undefined;
  const isLeadPage = chunkStartPage !== null && chunkStartPage === page.pageNumber;
  const isEvenPagesSetting = pagesPerUser % 2 === 0;
  const isOddPage = page.pageNumber % 2 === 1;
  const isAssignable =
    Boolean(
      page.canAssignUser &&
        (
          page.pageNumber === 4 || // Page 4 is always assignable
          pagesPerUser <= 2 ||
          !friendFacingPages ||
          !isEvenPagesSetting ||
          isOddPage ||
          (pagesPerUser === 4 && friendFacingPages) // All pages assignable when pagesPerUser is 4 and facing pages is enabled
        ),
    );
  const isAddedPage = page.pageNumber > DEFAULT_ASSIGNMENT_PAGE_COUNT;
  const isFirstPageOfPair = page.pageNumber % 2 === 1; // Odd page numbers are first in a pair
  
  // Check if there are any assignments on the page pair that would be removed
  const pairStart = page.pageNumber; // Since we only show button on first page of pair
  const pairEnd = pairStart + 1;
  const hasAssignmentsOnPair = pageAssignments[pairStart] !== undefined || pageAssignments[pairEnd] !== undefined;
  
  // Check if removing this page pair would cause an assigned page to become the last (unassignable) page
  // When removing a page pair, pages after the pair shift down by 2
  // If the new last page (totalPages - 2) is assigned, we can't remove the pair
  const wouldCauseAssignedPageToBecomeLast = (() => {
    if (pairEnd >= totalPages) {
      // This is the last page pair, check if the page that would become the new last page is assigned
      const newLastPage = totalPages - 2;
      return newLastPage >= 4 && pageAssignments[newLastPage] !== undefined;
    }
    // For non-last pairs, check if any assigned page after this pair would shift to become the last page
    // After removal, totalPages becomes totalPages - 2
    // A page at position `pageNum` shifts to `pageNum - 2`
    // If `pageNum - 2 >= totalPages - 2`, that page becomes the last page
    // So if `pageNum >= totalPages`, that page would become the last page
    const newTotalPages = totalPages - 2;
    for (let pageNum = pairEnd + 1; pageNum < totalPages; pageNum++) {
      if (pageAssignments[pageNum] !== undefined) {
        const shiftedPageNum = pageNum - 2;
        if (shiftedPageNum >= newTotalPages) {
          // This assigned page would become or be after the new last page
          return true;
        }
      }
    }
    return false;
  })();

  const { isOver, setNodeRef } = useDroppable({
    id: `page-${page.pageNumber}`,
    data: { type: 'page', pageNumber: page.pageNumber },
    disabled: !isAssignable,
  });

  const showDropTarget = isOver && isAssignable && activeFriendId !== null;

  const title = assignedFriend
    ? `Assigned to ${assignedFriend.name}`
    : isAssignable
      ? `Drag to assign page ${page.pageNumber}`
      : 'Not assignable';

  return (
    <div className="flex flex-col text-xs" style={{ width: '50px' }}>
        {/* <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Page {page.pageNumber}</p> */}
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-xl border-4 bg-white flex flex-col items-center justify-top transition-all p-0.5 relative',
          assignedFriend ? 'shadow-sm' : 'border-muted-foreground/20',
          !isAssignable && 'opacity-60',
          showDropTarget && 'ring-2 ring-primary',
        )}
        style={{
          borderColor: assignedFriend ? `#${color}` : undefined,
          aspectRatio: '210 / 297',
          width: '50px',
          ...((page.pageNumber <= 3 || page.pageNumber === totalPages) && {
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.1) 2px,
              rgba(0, 0, 0, 0.1) 4px
            )`,
          }),
        }}
        title={title}
      >
          {/* Remove Pages Button for added pages (only on first page of pair) */}
          {isAddedPage && isFirstPageOfPair && (
            <Tooltip
              content={
                hasAssignmentsOnPair
                  ? "Remove page assignments first before removing these 2 pages"
                  : wouldCauseAssignedPageToBecomeLast
                    ? "Cannot remove these pages: an assigned page would become the last (unassignable) page"
                    : "Remove these 2 pages"
              }
              side="bottom"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasAssignmentsOnPair && !wouldCauseAssignedPageToBecomeLast) {
                    onRemovePages(page.pageNumber);
                  }
                }}
                disabled={hasAssignmentsOnPair || wouldCauseAssignedPageToBecomeLast}
                className={cn(
                  "absolute -top-3 -right-9 h-5 w-5 rounded-full bg-white border border-muted-foreground/20 shadow-sm flex items-center justify-center transition-colors z-10",
                  hasAssignmentsOnPair || wouldCauseAssignedPageToBecomeLast
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-muted/50 cursor-pointer"
                )}
                aria-label={
                  hasAssignmentsOnPair
                    ? "Cannot remove pages with assignments"
                    : wouldCauseAssignedPageToBecomeLast
                      ? "Cannot remove: would cause assigned page to become last page"
                      : "Remove pages"
                }
              >
                <CircleMinus className="h-3 w-3 text-muted-foreground" />
              </button>
            </Tooltip>
          )}
          {/* Page number in bottom left corner */}
          <span className="absolute bottom-0.5 left-0.5 text-xs font-medium text-muted-foreground">
            {page.pageNumber}
          </span>
          {assignedFriend ? (
            isLeadPage ? (
              <div className="relative group flex items-center justify-center">
                <ProfilePicture
                  name={assignedFriend.name}
                  size="sm"
                  userId={assignedFriend.id > 0 ? assignedFriend.id : undefined}
                  editable={false}
                  className='w-9 h-9'
                  // variant='withColoredBorder'
                />
                  {chunkStartPage !== null && (
                    <div className="absolute top-0 right-0">
                      <Tooltip content={`Unassign ${assignedFriend.name}`} side="bottom">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 hover:bg-white/50 text-foreground rounded-full"
                          onClick={() => onClear(chunkStartPage)}
                          aria-label="Remove assignment"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground text-center px-1">
                {/* Assigned */}
                </p>
            )
          ) : null}
        </div>
    </div>
  );
}

function clearAssignmentChunk(
  state: TeamAssignmentState,
  startPage: number,
  pagesPerUser: number,
): TeamAssignmentState {
  const updatedAssignments: Record<number, number> = { ...state.pageAssignments };
  let changed = false;
  for (let offset = 0; offset < pagesPerUser; offset++) {
    const pageNumber = startPage + offset;
    if (updatedAssignments[pageNumber] !== undefined) {
      delete updatedAssignments[pageNumber];
      changed = true;
    }
  }
  if (!changed) return state;
  return {
    ...state,
    pageAssignments: updatedAssignments,
  };
}

function clearAssignmentsForFriend(
  state: TeamAssignmentState,
  friendId: number,
): TeamAssignmentState {
  const entries = Object.entries(state.pageAssignments).filter(
    ([, assignedId]) => Number(assignedId) !== friendId,
  );
  if (entries.length === Object.keys(state.pageAssignments).length) return state;
  const nextAssignments: Record<number, number> = {};
  entries.forEach(([page, assignedId]) => {
    nextAssignments[Number(page)] = Number(assignedId);
  });
  return {
    ...state,
    pageAssignments: nextAssignments,
  };
}

function ensureCapacityForRange(
  state: TeamAssignmentState,
  startPage: number,
  pagesPerUser: number,
): TeamAssignmentState {
  // Allow page 4, otherwise normalize to CONTENT_START_PAGE
  const normalizedStart = startPage === 4 ? 4 : Math.max(startPage, CONTENT_START_PAGE);
  const requiredPage = normalizedStart + pagesPerUser;
  let totalPages = ensureEvenTotalPages(state.totalPages); // Ensure starting from even number
  while (totalPages < requiredPage) {
    totalPages += 2; // Always add 2 pages at a time
  }
  totalPages = ensureEvenTotalPages(totalPages); // Ensure result is even
  if (totalPages === state.totalPages) {
    return state;
  }
  return {
    ...state,
    totalPages,
  };
}

function assignPagesToFriend(
  state: TeamAssignmentState,
  startPage: number,
  friendId: number,
  pagesPerUser: number,
): TeamAssignmentState {
  // Allow page 4, otherwise normalize to CONTENT_START_PAGE
  const normalizedStart = startPage === 4 ? 4 : Math.max(startPage, CONTENT_START_PAGE);
  const ensured = ensureCapacityForRange(state, normalizedStart, pagesPerUser);
  const updatedAssignments: Record<number, number> = { ...ensured.pageAssignments };
  for (let offset = 0; offset < pagesPerUser; offset++) {
    const pageNumber = normalizedStart + offset;
    if (pageNumber < ensured.totalPages) {
      updatedAssignments[pageNumber] = friendId;
    }
  }
  return {
    ...ensured,
    pageAssignments: updatedAssignments,
  };
}

function buildAutoAssignmentState(
  baseState: TeamAssignmentState,
  friends: Friend[],
  pagesPerUser: number,
  startPage: number = CONTENT_START_PAGE,
): TeamAssignmentState {
  // Ensure starting totalPages is even
  const initialTotalPages = ensureEvenTotalPages(Math.max(baseState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT));
  let nextState: TeamAssignmentState = {
    totalPages: initialTotalPages,
    pageAssignments: {},
  };
  friends.forEach((friend, index) => {
    const friendStartPage = startPage + index * pagesPerUser;
    nextState = assignPagesToFriend(nextState, friendStartPage, friend.id, pagesPerUser);
  });
  // Ensure final totalPages is even
  nextState.totalPages = ensureEvenTotalPages(nextState.totalPages);
  return nextState;
}

function adjustAssignmentsForPageCountChange(
  state: TeamAssignmentState,
  oldPagesPerUser: number,
  newPagesPerUser: number,
  currentTotalPages: number,
): TeamAssignmentState {
  // If no assignments, return state as is
  if (Object.keys(state.pageAssignments).length === 0) {
    return state;
  }

  // Extract all assignment chunks (groups of consecutive pages assigned to the same friend)
  const chunks: Array<{ friendId: number; startPage: number; endPage: number }> = [];
  const assignments = state.pageAssignments;
  const sortedPages = Object.keys(assignments)
    .map(Number)
    .filter(page => page >= 4) // Only consider assignable pages (page 4 and content pages)
    .sort((a, b) => a - b);

  if (sortedPages.length === 0) {
    return state;
  }

  // Group consecutive pages by friendId into chunks
  let currentChunk: { friendId: number; startPage: number; endPage: number } | null = null;
  for (const page of sortedPages) {
    const friendId = assignments[page];
    if (!currentChunk || currentChunk.friendId !== friendId || currentChunk.endPage + 1 !== page) {
      // Start a new chunk
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = { friendId, startPage: page, endPage: page };
    } else {
      // Extend current chunk
      currentChunk.endPage = page;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 0) {
    return state;
  }

  const newAssignments: Record<number, number> = {};
  let totalPages = currentTotalPages;

  if (newPagesPerUser > oldPagesPerUser) {
    // Increasing pages per user: expand chunks and push subsequent chunks
    let currentPage = chunks[0].startPage;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Calculate new start page for this chunk
      if (i > 0) {
        // Check if there's a gap between the previous chunk and this chunk
        const hasGap = chunk.startPage > chunks[i - 1].endPage + 1;
        
        if (hasGap) {
          // There's a gap, so keep the original start position
          currentPage = chunk.startPage;
        } else {
          // No gap - place right after where the previous chunk ended
          // The previous chunk ended at (currentPage - newPagesPerUser) + newPagesPerUser - 1
          // which simplifies to currentPage - 1, so next chunk starts at currentPage
          // Actually, currentPage already points to where the previous chunk ended + 1
          // So we can just use it as is
        }
      }
      
      // Assign new pages for this chunk
      for (let offset = 0; offset < newPagesPerUser; offset++) {
        const pageNumber = currentPage + offset;
        if (pageNumber >= 4) {
          newAssignments[pageNumber] = chunk.friendId;
          // Ensure totalPages is sufficient and always even
          if (pageNumber >= totalPages) {
            totalPages = ensureEvenTotalPages(pageNumber + 1);
          }
        }
      }
      
      // Update currentPage to point to where the next chunk should start
      // (right after this chunk's new end)
      currentPage = currentPage + newPagesPerUser;
    }
  } else {
    // Decreasing pages per user: compress chunks, but stop at gaps
    let currentPage = chunks[0].startPage;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Check if there's a gap before this chunk
      const hasGapBefore = i === 0 
        ? chunk.startPage > 4
        : chunks[i - 1].endPage + 1 < chunk.startPage;
      
      if (hasGapBefore) {
        // Don't compress past the gap - keep original start position
        currentPage = chunk.startPage;
      } else if (i > 0) {
        // No gap - compress by placing right after where the previous chunk ended
        // currentPage already points to where the previous chunk ended + 1
        // So we can use it as is
      }
      // For i === 0, currentPage is already set to chunk.startPage
      
      // Assign new pages for this chunk
      for (let offset = 0; offset < newPagesPerUser; offset++) {
        const pageNumber = currentPage + offset;
        if (pageNumber >= 4) {
          newAssignments[pageNumber] = chunk.friendId;
        }
      }
      
      // Update currentPage to point to where the next chunk should start
      // (right after this chunk's new end)
      currentPage = currentPage + newPagesPerUser;
    }
  }

  return {
    ...state,
    totalPages: ensureEvenTotalPages(Math.max(totalPages, state.totalPages)),
    pageAssignments: newAssignments,
  };
}

function adjustAssignmentsForFacingPages(
  state: TeamAssignmentState,
  pagesPerUser: number,
  currentTotalPages: number,
): TeamAssignmentState {
  // Only adjust if pagesPerUser is 2 or 4
  if (pagesPerUser !== 2 && pagesPerUser !== 4) {
    return state;
  }

  // If no assignments, return state as is
  if (Object.keys(state.pageAssignments).length === 0) {
    return state;
  }

  // Extract all assignment chunks (groups of consecutive pages assigned to the same friend)
  const chunks: Array<{ friendId: number; startPage: number; endPage: number }> = [];
  const assignments = state.pageAssignments;
  const sortedPages = Object.keys(assignments)
    .map(Number)
    .filter(page => page >= 4) // Only consider assignable pages (page 4 and content pages)
    .sort((a, b) => a - b);

  if (sortedPages.length === 0) {
    return state;
  }

  // Group consecutive pages by friendId into chunks
  let currentChunk: { friendId: number; startPage: number; endPage: number } | null = null;
  for (const page of sortedPages) {
    const friendId = assignments[page];
    if (!currentChunk || currentChunk.friendId !== friendId || currentChunk.endPage + 1 !== page) {
      // Start a new chunk
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = { friendId, startPage: page, endPage: page };
    } else {
      // Extend current chunk
      currentChunk.endPage = page;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 0) {
    return state;
  }

  const newAssignments: Record<number, number> = {};
  let totalPages = currentTotalPages;

  // Helper function to check if a range of pages fits within page pairs
  // For 2 pages: must be in same pair (e.g., 5,6 or 7,8)
  // For 4 pages: must be in two consecutive pairs (e.g., 5,6,7,8 or 7,8,9,10)
  const isWithinPairs = (startPage: number, pagesPerUser: number): boolean => {
    if (pagesPerUser === 2) {
      // Must be in same pair: startPage must be odd, endPage must be even, and consecutive
      return startPage % 2 === 1 && (startPage + 1) % 2 === 0;
    } else if (pagesPerUser === 4) {
      // Must be in two consecutive pairs: startPage odd, endPage even, spanning exactly 2 pairs
      const endPage = startPage + 3;
      return startPage % 2 === 1 && endPage % 2 === 0;
    }
    return false;
  };

  // Helper function to find the next valid pair-aligned start page
  const getNextPairAlignedStart = (startPage: number, pagesPerUser: number): number => {
    if (pagesPerUser === 2) {
      // Find next odd page (start of a pair)
      return startPage % 2 === 1 ? startPage : startPage + 1;
    } else if (pagesPerUser === 4) {
      // Find next odd page (start of first pair in the two-pair range)
      return startPage % 2 === 1 ? startPage : startPage + 1;
    }
    return startPage;
  };

  let currentPage = chunks[0].startPage;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Check if there's a gap before this chunk
    const hasGapBefore = i === 0 
      ? chunk.startPage > 4
      : chunks[i - 1].endPage + 1 < chunk.startPage;
    
    if (hasGapBefore) {
      // There's a gap, find the next valid pair-aligned start
      currentPage = getNextPairAlignedStart(chunk.startPage, pagesPerUser);
      // Ensure it's at least 4 (page 4 is assignable, but for facing pages we might want to start at 5)
      if (currentPage < 4) {
        currentPage = 4;
      }
      // For facing pages, if starting at 4, we might want to move to 5 to have a proper pair
      // But page 4 is special - let's check if the chunk originally started at 4
      if (currentPage === 4 && chunk.startPage === 4) {
        // If it's page 4 and we need facing pages, move to 5 (start of pair 5,6)
        currentPage = 5;
      }
    } else if (i > 0) {
      // No gap - place after previous chunk, but align to page pair
      // Previous chunk ended at currentPage - 1 (before we update it)
      const prevChunkEnd = currentPage - 1; // End of previous chunk
      const nextPage = prevChunkEnd + 1;
      currentPage = getNextPairAlignedStart(nextPage, pagesPerUser);
    } else {
      // First chunk - align to page pair
      currentPage = getNextPairAlignedStart(chunk.startPage, pagesPerUser);
      // Special handling for page 4
      if (currentPage === 4 && chunk.startPage === 4) {
        // If it's page 4 and we need facing pages, move to 5 (start of pair 5,6)
        currentPage = 5;
      }
    }
    
    // Ensure currentPage is at least 4 (page 4 is assignable)
    if (currentPage < 4) {
      currentPage = 4;
    }
    
    // Verify the assignment fits within page pairs
    if (!isWithinPairs(currentPage, pagesPerUser)) {
      // If not, find the next valid pair-aligned start
      currentPage = getNextPairAlignedStart(currentPage, pagesPerUser);
    }
    
    // Assign new pages for this chunk
    for (let offset = 0; offset < pagesPerUser; offset++) {
      const pageNumber = currentPage + offset;
      if (pageNumber >= 4) {
        newAssignments[pageNumber] = chunk.friendId;
        // Ensure totalPages is sufficient
        if (pageNumber >= totalPages) {
          totalPages = pageNumber + 1;
        }
      }
    }
    
    // Update currentPage to point to where the next chunk should start
    currentPage = currentPage + pagesPerUser;
  }

  return {
    ...state,
    totalPages: ensureEvenTotalPages(Math.max(totalPages, state.totalPages)),
    pageAssignments: newAssignments,
  };
}

function getPageType(pageNumber: number, totalPages: number): PageType {
  if (pageNumber === 1) return 'back-cover';
  if (pageNumber === 2) return 'front-cover';
  if (pageNumber === 3) return 'inner-front-left';
  if (pageNumber === 4) return 'inner-front-right';
  if (pageNumber === totalPages) return 'inner-back';
  return 'content';
}


