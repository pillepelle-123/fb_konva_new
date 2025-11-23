import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';

import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { CreatableCombobox } from '../../../ui/primitives/creatable-combobox';
import InviteUserDialog from '../invite-user-dialog';
import ProfilePicture from '../../users/profile-picture';
import { cn } from '../../../../lib/utils';
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

export function TeamStep({ wizardState, onTeamChange, availableFriends }: TeamStepProps) {
  const [activeDraggedFriendId, setActiveDraggedFriendId] = useState<number | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [initialEmail, setInitialEmail] = useState('');
  const [initialName, setInitialName] = useState('');
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);

  const assignmentState =
    wizardState.team.assignmentState ?? getDefaultTeamAssignmentState();
  const selectedFriends = wizardState.team.selectedFriends;
  const pagesPerUser = wizardState.team.pagesPerUser;

  useEffect(() => {
    if (!wizardState.team.assignmentState) {
      onTeamChange({ assignmentState: getDefaultTeamAssignmentState() });
    }
  }, [wizardState.team.assignmentState, onTeamChange]);

  useEffect(() => {
    const shouldAutoAssign =
      wizardState.team.autoAssign &&
      selectedFriends.length > 0 &&
      Object.keys(assignmentState.pageAssignments ?? {}).length === 0;

    if (shouldAutoAssign) {
      const nextState = buildAutoAssignmentState(assignmentState, selectedFriends, pagesPerUser);
      onTeamChange({ assignmentState: nextState });
    }
  }, [assignmentState, onTeamChange, pagesPerUser, selectedFriends, wizardState.team.autoAssign]);

  const totalPages = Math.max(assignmentState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT);
  const assignablePageCount = Math.max(totalPages - CONTENT_START_PAGE, 0);
  const assignableBlocksCount = Math.floor(assignablePageCount / pagesPerUser);
  const extraPages = Math.max(totalPages - DEFAULT_ASSIGNMENT_PAGE_COUNT, 0);

  const pageTiles = useMemo<PageTile[]>(() => {
    const tiles: PageTile[] = [];
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
        while (
          start - 1 >= CONTENT_START_PAGE &&
          assignmentState.pageAssignments[start - 1] === friendId
        ) {
          start--;
        }
        chunkStartPage = start;
      }
      tiles.push({ page, assignedFriend, chunkStartPage });
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
      id: uuid(),
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
    onTeamChange({
      pagesPerUser: value,
      friendFacingPages: nextFacing,
      assignmentState: getDefaultTeamAssignmentState(),
    });
  };

  const handleFacingPagesToggle = (checked: boolean) => {
    if (pagesPerUser % 2 !== 0) return;
    onTeamChange({
      friendFacingPages: checked,
      assignmentState: getDefaultTeamAssignmentState(),
    });
  };

  const handleAutoAssignToggle = (checked: boolean) => {
    onTeamChange({ autoAssign: checked });
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
      if (pageNumber !== undefined) {
        let startPage = pageNumber;
        if (
          wizardState.team.friendFacingPages &&
          pagesPerUser % 2 === 0 &&
          startPage % 2 === 0
        ) {
          startPage = Math.max(startPage - 1, CONTENT_START_PAGE);
        }
        handleAssignPages(friendId, startPage);
      }
    }

    setActiveDraggedFriendId(null);
  };

  const handleDragCancel = () => {
    setActiveDraggedFriendId(null);
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

  return (
    <div className="space-y-6">
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid gap-6 lg:grid-cols-[320px_auto]">
          <div className="space-y-5">
            <div className="rounded-lg border bg-white p-4 shadow-sm space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Invite collaborators</p>
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
                      <div className="space-y-2">
                        {selectedFriends.map((friend) => (
                          <CollaboratorDraggableCard
                            key={friend.id}
                            friend={friend}
                            onRemove={removeFriend}
                            isActive={activeDraggedFriendId === friend.id}
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
                  <div className="flex gap-2">
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
                  </div>
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
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={wizardState.team.autoAssign}
                      onChange={(event) => handleAutoAssignToggle(event.target.checked)}
                    />
                    <span className="text-sm">
                      Auto assign
                      <span className="block text-xs text-muted-foreground">
                        Automatically distribute collaborators the next time this step opens.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border bg-white p-4 shadow-inner flex flex-col min-h-[500px]"
            style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}
          >
            <BookTimeline
              pageTiles={pageTiles}
              activeFriendId={activeDraggedFriendId}
              onClear={handleClearAssignment}
              totalPages={totalPages}
              assignablePageCount={assignablePageCount}
              extraPages={extraPages}
              assignableBlocksCount={assignableBlocksCount}
              assignedBlocksCount={assignedBlocksCount}
              pagesPerUser={pagesPerUser}
              friendFacingPages={wizardState.team.friendFacingPages}
            />
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-card p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing',
        (isDragging || isActive) && 'ring-2 ring-primary/40 shadow-sm',
        disableDrag && 'opacity-80',
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
      {!hideRemove && (
        <button
          onClick={() => onRemove(friend.id)}
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          aria-label={`Remove ${friend.name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
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
  totalPages: number;
  assignablePageCount: number;
  extraPages: number;
  assignableBlocksCount: number;
  assignedBlocksCount: number;
  pagesPerUser: 1 | 2 | 3 | 4;
  friendFacingPages: boolean;
}

function BookTimeline({
  pageTiles,
  activeFriendId,
  onClear,
  totalPages,
  assignablePageCount,
  extraPages,
  assignableBlocksCount,
  assignedBlocksCount,
  pagesPerUser,
  friendFacingPages,
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
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p a className="text-sm font-semibold">Assignments</p>
          <p className="text-xs text-muted-foreground">
            {assignablePageCount} assignable pages • {assignableBlocksCount} bundles × {pagesPerUser} pages • {totalPages} pages total
          </p>
          <p className="text-[11px] text-muted-foreground">
            {assignedBlocksCount} bundles assigned · {Math.max(assignableBlocksCount - assignedBlocksCount, 0)} open
          </p>
        </div>
        {extraPages > 0 && (
          <span className="text-[11px] text-amber-600 border border-amber-200 rounded-full px-3 py-0.5 bg-amber-50">
            +{extraPages} extra pages
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 rounded-lg border bg-white p-3 shadow-sm overflow-y-auto">
        <div className="flex flex-wrap gap-y-4">
          {pagePairs.map((pair, index) => (
            <div key={`pair-${index}`} className="flex gap-2 mr-8">
              {pair.map(({ page, assignedFriend, chunkStartPage }) => (
                <PageAssignmentTile
                  key={page.pageNumber}
                  page={page}
                  assignedFriend={assignedFriend}
                  chunkStartPage={chunkStartPage}
                  onClear={onClear}
                      activeFriendId={activeFriendId}
                      pagesPerUser={pagesPerUser}
                      friendFacingPages={friendFacingPages}
                />
              ))}
            </div>
          ))}
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
  activeFriendId: number | null;
  pagesPerUser: 1 | 2 | 3 | 4;
  friendFacingPages: boolean;
}

function PageAssignmentTile({
  page,
  assignedFriend,
  chunkStartPage,
  onClear,
  activeFriendId,
  pagesPerUser,
  friendFacingPages,
}: PageAssignmentTileProps) {
  const color = assignedFriend ? getConsistentColor(assignedFriend.name) : undefined;
  const isLeadPage = chunkStartPage !== null && chunkStartPage === page.pageNumber;
  const isEvenPagesSetting = pagesPerUser % 2 === 0;
  const isOddPage = page.pageNumber % 2 === 1;
  const isAssignable =
    Boolean(
      page.canAssignUser &&
        (
          pagesPerUser <= 2 ||
          !friendFacingPages ||
          !isEvenPagesSetting ||
          isOddPage
        ),
    );

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
    <Tooltip side="bottom" content={title}>
      <div className="flex flex-col text-xs gap-2" style={{ width: '100px' }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Page {page.pageNumber}</p>
        <div
          ref={setNodeRef}
          className={cn(
            'rounded-xl border-4 bg-white flex flex-col items-end justify-top transition-all p-1',
            assignedFriend ? 'shadow-sm' : 'border-muted-foreground/20',
            !isAssignable && 'opacity-60',
            showDropTarget && 'ring-2 ring-primary',
          )}
          style={{
            borderColor: assignedFriend ? `#${color}` : undefined,
            aspectRatio: '210 / 297',
            width: '100px',
          }}
        >
          {assignedFriend ? (
            isLeadPage ? (
              <div className="relative group">
                <ProfilePicture
                  name={assignedFriend.name}
                  size="sm"
                  userId={assignedFriend.id > 0 ? assignedFriend.id : undefined}
                  editable={false}
                />
                {chunkStartPage !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white text-foreground"
                    onClick={() => onClear(chunkStartPage)}
                    aria-label="Remove assignment"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground text-center px-2">Assigned</p>
            )
          ) : (
            <p className="text-[11px] text-muted-foreground text-center px-2">
              {isAssignable ? 'Assignable' : 'Special Page'}
            </p>
          )}
        </div>
      </div>
    </Tooltip>
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
  const normalizedStart = Math.max(startPage, CONTENT_START_PAGE);
  const requiredPage = normalizedStart + pagesPerUser;
  let totalPages = state.totalPages;
  while (totalPages < requiredPage) {
    totalPages += 2;
  }
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
  const normalizedStart = Math.max(startPage, CONTENT_START_PAGE);
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
): TeamAssignmentState {
  let nextState: TeamAssignmentState = {
    totalPages: Math.max(baseState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT),
    pageAssignments: {},
  };
  friends.forEach((friend, index) => {
    const startPage = CONTENT_START_PAGE + index * pagesPerUser;
    nextState = assignPagesToFriend(nextState, startPage, friend.id, pagesPerUser);
  });
  return nextState;
}

function getPageType(pageNumber: number, totalPages: number): PageType {
  if (pageNumber === 1) return 'back-cover';
  if (pageNumber === 2) return 'front-cover';
  if (pageNumber === 3) return 'inner-front-left';
  if (pageNumber === 4) return 'inner-front-right';
  if (pageNumber === totalPages) return 'inner-back';
  return 'content';
}


