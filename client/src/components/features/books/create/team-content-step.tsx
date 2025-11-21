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
import { ArrowLeft, ArrowRight, MessageCircleQuestionMark, Plus, Users, X } from 'lucide-react';
import { v4 as uuid } from 'uuid';

import { Button } from '../../../ui/primitives/button';
import { Badge } from '../../../ui/composites/badge';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../ui/overlays/dialog';
import { CreatableCombobox } from '../../../ui/primitives/creatable-combobox';
import InviteUserDialog from '../invite-user-dialog';
import ProfilePicture from '../../users/profile-picture';
import { cn } from '../../../../lib/utils';
import {
  curatedQuestions,
  type Friend,
  type InviteDraft,
  type WizardState,
  DEFAULT_ASSIGNMENT_PAGE_COUNT,
  getDefaultTeamAssignmentState,
  type TeamAssignmentState,
} from './types';

type DialogStep = 'select' | 'assign';

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

interface PageSpread {
  id: string;
  index: number;
  pages: PageInfo[];
}

interface PageBlockWithAssignment {
  id: string;
  index: number;
  pages: PageInfo[];
  isAssignable: boolean;
  assignedFriend?: Friend;
}

interface TeamContentStepProps {
  wizardState: WizardState;
  onTeamChange: (data: Partial<WizardState['team']>) => void;
  onQuestionChange: (data: Partial<WizardState['questions']>) => void;
  availableFriends: Friend[];
  openCustomQuestionModal: () => void;
}

const CONTENT_START_PAGE = 5;
const COLOR_PALETTE = [
  'FF8A65',
  '9575CD',
  '4DD0E1',
  'F06292',
  '4DB6AC',
  'BA68C8',
  'AED581',
  '7986CB',
  '4FC3F7',
  'FFB74D',
];

export function TeamContentStep({
  wizardState,
  onTeamChange,
  onQuestionChange,
  availableFriends,
  openCustomQuestionModal,
}: TeamContentStepProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>('select');
  const [activeBlockSelector, setActiveBlockSelector] = useState<string | null>(null);
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
    const validIds = new Set(selectedFriends.map((friend) => friend.id));
    const sanitizedState = sanitizeAssignmentsForFriends(assignmentState, validIds);
    if (sanitizedState !== assignmentState) {
      onTeamChange({ assignmentState: sanitizedState });
    }
  }, [assignmentState, onTeamChange, selectedFriends]);

  useEffect(() => {
    const shouldAutoAssign =
      assignDialogOpen &&
      dialogStep === 'assign' &&
      wizardState.team.autoAssign &&
      selectedFriends.length > 0 &&
      Object.keys(assignmentState.pageAssignments ?? {}).length === 0;

    if (shouldAutoAssign) {
      const nextState = buildAutoAssignmentState(assignmentState, selectedFriends, pagesPerUser);
      onTeamChange({ assignmentState: nextState });
    }
  }, [
    assignDialogOpen,
    assignmentState,
    dialogStep,
    onTeamChange,
    pagesPerUser,
    selectedFriends,
    wizardState.team.autoAssign,
  ]);

  const totalPages = Math.max(assignmentState.totalPages, DEFAULT_ASSIGNMENT_PAGE_COUNT);
  const assignablePageCount = Math.max(totalPages - CONTENT_START_PAGE, 0);
  const assignableBlocksCount = Math.floor(assignablePageCount / pagesPerUser);
  const extraPages = Math.max(totalPages - DEFAULT_ASSIGNMENT_PAGE_COUNT, 0);

  const pageSpreads = useMemo(() => buildPageSpreads(totalPages), [totalPages]);
  const blocksWithAssignments = useMemo(
    () =>
      buildBlocks(
        totalPages,
        pagesPerUser,
        assignmentState.pageAssignments,
        selectedFriends,
      ),
    [assignmentState.pageAssignments, pagesPerUser, selectedFriends, totalPages],
  );
  const assignedBlocksCount = useMemo(
    () => blocksWithAssignments.filter((block) => !!block.assignedFriend).length,
    [blocksWithAssignments],
  );
  const pageToBlockMap = useMemo(() => {
    const map = new Map<number, PageBlockWithAssignment>();
    blocksWithAssignments.forEach((block) => {
      block.pages.forEach((page) => map.set(page.pageNumber, block));
    });
    return map;
  }, [blocksWithAssignments]);

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

  const selectedQuestionIds = wizardState.questions.selectedDefaults;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeDraggedFriend = selectedFriends.find(
    (friend) => friend.id === activeDraggedFriendId,
  );

  const handleDialogOpenChange = (open: boolean) => {
    setAssignDialogOpen(open);
    if (!open) {
      setDialogStep('select');
      setActiveBlockSelector(null);
      setActiveDraggedFriendId(null);
    }
  };

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
    setAssignDialogOpen(true);
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

  const handleGroupChatToggle = (checked: boolean) => {
    onTeamChange({ enableGroupChat: checked });
  };

  const handleToggleQuestion = (questionId: string) => {
    const nextSelection = selectedQuestionIds.includes(questionId)
      ? selectedQuestionIds.filter((id) => id !== questionId)
      : [...selectedQuestionIds, questionId];
    onQuestionChange({ selectedDefaults: nextSelection });
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

    if (activeType === 'collaborator' && overType === 'collaborator' && dialogStep === 'select') {
      const activeId = active.data.current?.friendId;
      const overId = over.data.current?.friendId;
      const oldIndex = selectedFriends.findIndex((friend) => friend.id === activeId);
      const newIndex = selectedFriends.findIndex((friend) => friend.id === overId);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove(selectedFriends, oldIndex, newIndex);
        onTeamChange({ selectedFriends: reordered });
      }
    }

    if (activeType === 'collaborator' && overType === 'page-block' && dialogStep === 'assign') {
      const friendId = active.data.current?.friendId as number;
      const blockId = over.id as string;
      handleAssignBlock(blockId, friendId);
      setActiveBlockSelector(null);
    }

    setActiveDraggedFriendId(null);
  };

  const handleDragCancel = () => {
    setActiveDraggedFriendId(null);
  };

  const handleAssignBlock = (blockId: string, friendId: number) => {
    const blockIndex = parseInt(blockId.replace('block-', ''), 10);
    if (Number.isNaN(blockIndex)) return;
    const nextState = assignFriendToBlock(assignmentState, blockIndex, friendId, pagesPerUser);
    onTeamChange({ assignmentState: nextState });
  };

  const handleClearAssignment = (blockId: string) => {
    const blockIndex = parseInt(blockId.replace('block-', ''), 10);
    if (Number.isNaN(blockIndex)) return;
    const nextState = clearBlockAssignments(assignmentState, blockIndex, pagesPerUser);
    if (nextState !== assignmentState) {
      onTeamChange({ assignmentState: nextState });
    }
  };

  const handleToggleBlockSelector = (blockId: string) => {
    setActiveBlockSelector((current) => (current === blockId ? null : blockId));
  };

  const handleResetCollaborators = () => {
    onTeamChange({
      selectedFriends: [],
      invites: [],
      assignmentState: getDefaultTeamAssignmentState(),
    });
  };

  const handleNextStep = () => {
    if (selectedFriends.length === 0) return;
    setDialogStep('assign');
  };

  const handleBackStep = () => {
    setDialogStep('select');
  };

  const handleDialogSkip = () => {
    handleDialogOpenChange(false);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground tracking-wide">
      <span className={cn('px-2 py-1 rounded-full border', dialogStep === 'select' && 'bg-primary/10 text-primary border-primary/30')}>
        1. Add Collaborators
      </span>
      <ArrowRight className="h-3.5 w-3.5" />
      <span className={cn('px-2 py-1 rounded-full border', dialogStep === 'assign' && 'bg-primary/10 text-primary border-primary/30')}>
        2. Assign Pages
      </span>
    </div>
  );

  const renderStepOne = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Lade Freunde ein oder wähle sie aus deiner Liste aus. Sie erhalten Zugriff nach der Bucherstellung.
        </p>
        <CreatableCombobox
          options={friendOptions}
          value={undefined}
          onChange={handleSelectFriend}
          onCreateOption={handleCreateFriend}
          placeholder="Freund suchen oder einladen..."
          inputPlaceholder="Name oder E-Mail..."
          emptyLabel="Keine Freunde gefunden"
          allowClear={false}
        />
      </div>

      <div className="rounded-lg border bg-muted/30 px-3 py-2 min-h-[220px]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide">Ausgewählte Kollaboratoren</p>
          <span className="text-[11px] text-muted-foreground">{selectedFriends.length} Personen</span>
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto pr-1">
          {selectedFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch niemand ausgewählt.</p>
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
            <p className="text-sm font-semibold">Seiten pro Kollaborator</p>
            <p className="text-xs text-muted-foreground">Wähle aus, wie viele Seiten pro Drop vergeben werden.</p>
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

        <div className="grid gap-3 md:grid-cols-2">
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
                Vergibt nur komplette Doppelseiten (nur verfügbar bei gerader Seitenanzahl).
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
              Automatisch zuweisen
              <span className="block text-xs text-muted-foreground">
                Beim Wechsel zu Schritt 2 werden alle Mitwirkenden automatisch verteilt.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {assignableBlocksCount} Blöcke á {pagesPerUser} Seiten verfügbar.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleDialogSkip}>
            Überspringen
          </Button>
          <Button
            size="sm"
            onClick={handleNextStep}
            disabled={selectedFriends.length === 0}
          >
            Weiter zu Schritt 2
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="space-y-5 min-h-0 flex flex-col">
      <div className="grid gap-4 lg:grid-cols-[260px_auto] min-h-0">
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2">Kollaboratoren</p>
          {selectedFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Kollaboratoren ausgewählt.</p>
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
                    hideRemove
                  />
                ))}
              </div>
            </SortableContext>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Ziehe einen Namen auf den gewünschten Seitenblock oder nutze „Assign“ in der Liste.
          </p>
        </div>

        <div className="rounded-lg border bg-white p-3 shadow-inner flex flex-col min-h-0 max-h-[65vh]">
          <div className="flex-1 min-h-0">
            <BookTimeline
              spreads={pageSpreads}
              blocks={blocksWithAssignments}
              friends={selectedFriends}
              pageToBlockMap={pageToBlockMap}
              activeFriendId={activeDraggedFriendId}
              onAssign={handleAssignBlock}
              onClear={handleClearAssignment}
              onToggleSelector={handleToggleBlockSelector}
              activeBlockSelector={activeBlockSelector}
              totalPages={totalPages}
              assignablePageCount={assignablePageCount}
              extraPages={extraPages}
              assignableBlocksCount={assignableBlocksCount}
              assignedBlocksCount={assignedBlocksCount}
              pagesPerUser={pagesPerUser}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={handleBackStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onTeamChange({ assignmentState: getDefaultTeamAssignmentState() })}>
            Alles zurücksetzen
          </Button>
          <Button size="sm" onClick={() => handleDialogOpenChange(false)}>
            Fertig
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">Team & Seitenzuweisung</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Organisiere deine Kollaboratoren und verteile Seitenblöcke.
                </p>
              </div>
              <div className="flex gap-2">
                {selectedFriends.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleResetCollaborators}>
                    Zurücksetzen
                  </Button>
                )}
                <Button size="sm" onClick={() => handleDialogOpenChange(true)}>
                  {selectedFriends.length > 0 ? 'Bearbeiten' : 'Add Collaborators'}
                </Button>
              </div>
            </div>

            {selectedFriends.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {selectedFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <ProfilePicture
                        name={friend.name}
                        size="xs"
                        userId={friend.id > 0 ? friend.id : undefined}
                        editable={false}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{friend.name}</p>
                        {friend.email && (
                          <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => removeFriend(friend.id)}
                      aria-label={`Entferne ${friend.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Noch keine Kollaboratoren hinzugefügt. Nutze den Button, um neue Personen einzuladen.
              </p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Seiten pro Person</p>
                <p className="text-lg font-semibold">{pagesPerUser}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Facing Pages</p>
                <p className="text-lg font-semibold">
                  {wizardState.team.friendFacingPages && pagesPerUser % 2 === 0 ? 'Aktiv' : 'Deaktiviert'}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Zusatzseiten</p>
                <p className="text-lg font-semibold">+{extraPages}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="group-chat"
                checked={wizardState.team.enableGroupChat}
                onChange={(event) => handleGroupChatToggle(event.target.checked)}
              />
              <label htmlFor="group-chat" className="text-sm text-muted-foreground">
                Messenger-Gruppenchat für Kollaboratoren aktivieren
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm border p-4 flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <div className="flex items-center gap-2 text-sm font-semibold flex-shrink-0 mb-4">
            <MessageCircleQuestionMark className="h-5 w-5" />
            Question set
            <Badge variant="outline" className="text-[10px]">Optional</Badge>
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <p className="text-sm text-muted-foreground flex-shrink-0 mb-3">
              Wähle kuratierte Fragen oder füge eigene hinzu.
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 mb-3">
              <div className="space-y-2">
                {curatedQuestions.map((question) => (
                  <label key={question.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.includes(question.id)}
                      onChange={() => handleToggleQuestion(question.id)}
                    />
                    <span>{question.text}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 space-y-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={openCustomQuestionModal}>
                <Plus className="h-4 w-4 mr-2" />
                Eigene Frage hinzufügen
              </Button>
              {wizardState.questions.custom.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Eigene Fragen</p>
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

      <Dialog open={assignDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {dialogStep === 'select' ? 'Add Collaborators' : 'Assign to Pages'}
            </DialogTitle>
            <DialogDescription>
              {dialogStep === 'select'
                ? 'Wähle Mitwirkende, lege Seitenkontingente fest und fahre anschließend mit der Zuordnung fort.'
                : 'Ziehe Personen auf Seitenblöcke oder nutze das Kontextmenü, um Seiten zu vergeben.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto pr-2 max-h-[70vh]">
            {renderStepIndicator()}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {dialogStep === 'select' ? renderStepOne() : renderStepTwo()}
              <DragOverlay dropAnimation={null}>
                {activeDraggedFriend && (
                  <CollaboratorDragPreview friend={activeDraggedFriend} />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </DialogContent>
      </Dialog>

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
  spreads: PageSpread[];
  blocks: PageBlockWithAssignment[];
  friends: Friend[];
  pageToBlockMap: Map<number, PageBlockWithAssignment>;
  activeFriendId: number | null;
  onAssign: (blockId: string, friendId: number) => void;
  onClear: (blockId: string) => void;
  onToggleSelector: (blockId: string) => void;
  activeBlockSelector: string | null;
  totalPages: number;
  assignablePageCount: number;
  extraPages: number;
  assignableBlocksCount: number;
  assignedBlocksCount: number;
  pagesPerUser: 1 | 2 | 3 | 4;
}

function BookTimeline({
  spreads,
  blocks,
  friends,
  pageToBlockMap,
  activeFriendId,
  onAssign,
  onClear,
  onToggleSelector,
  activeBlockSelector,
  totalPages,
  assignablePageCount,
  extraPages,
  assignableBlocksCount,
  assignedBlocksCount,
  pagesPerUser,
}: BookTimelineProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold">Assign to Pages</p>
          <p className="text-xs text-muted-foreground">
            {assignablePageCount} zuweisbare Seiten • {assignableBlocksCount} Blöcke × {pagesPerUser} Seiten • {totalPages} Seiten gesamt
          </p>
          <p className="text-[11px] text-muted-foreground">
            {assignedBlocksCount} Blöcke belegt · {Math.max(assignableBlocksCount - assignedBlocksCount, 0)} offen
          </p>
        </div>
        {extraPages > 0 && (
          <Badge variant="outline" className="text-[11px] text-amber-600 border-amber-300 bg-amber-50">
            +{extraPages} Seiten automatisch ergänzt
          </Badge>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {spreads.map((spread) => (
            <TimelineSpread key={spread.id} spread={spread} pageToBlockMap={pageToBlockMap} />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Seitenblöcke ({blocks.length})
          </p>
          <div className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {blocks.map((block) => (
              <PageAssignmentBlock
                key={block.id}
                block={block}
                friends={friends}
                onAssign={onAssign}
                onClear={onClear}
                onToggleSelector={onToggleSelector}
                selectorActive={activeBlockSelector === block.id}
                activeFriendId={activeFriendId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineSpreadProps {
  spread: PageSpread;
  pageToBlockMap: Map<number, PageBlockWithAssignment>;
}

function TimelineSpread({ spread, pageToBlockMap }: TimelineSpreadProps) {
  return (
    <div className="rounded-lg border bg-white p-1 shadow-sm">
      <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
        Spread {spread.index + 1}
      </p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {spread.pages.map((page) => {
          const block = pageToBlockMap.get(page.pageNumber);
          const assignedFriend = block?.assignedFriend;
          const color = assignedFriend ? getConsistentColor(assignedFriend.name) : undefined;
          const background = color ? hexToRgba(color, 0.25) : undefined;
          const showProfilePicture =
            assignedFriend && block && block.pages[0] && block.pages[0].pageNumber === page.pageNumber;

          return (
            <div
              key={page.pageNumber}
              className={cn(
                'rounded-md border p-1 text-[10px] space-y-1 transition-all min-h-[60px] flex flex-col justify-between',
                page.canAssignUser ? 'text-foreground' : 'text-muted-foreground bg-muted/30',
              )}
              style={{
                backgroundColor: background,
                borderColor: color ? `#${color}` : undefined,
                opacity: page.canAssignUser ? 1 : 0.75,
              }}
            >
              <div className="flex items-center justify-between text-[8px] uppercase tracking-wide text-muted-foreground">
                <span>{getPageTypeLabel(page)}</span>
                <span>#{page.pageNumber}</span>
              </div>
              {assignedFriend ? (
                <div className="flex items-center gap-1 text-[10px] font-medium">
                  {showProfilePicture && (
                    <ProfilePicture
                      name={assignedFriend.name}
                      size="xs"
                      userId={assignedFriend.id > 0 ? assignedFriend.id : undefined}
                      editable={false}
                    />
                  )}
                  <span className="truncate">{assignedFriend.name}</span>
                </div>
              ) : (
                <p className="text-[10px]">{page.canAssignUser ? 'Verfügbar' : 'Spezialseite'}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PageAssignmentBlockProps {
  block: PageBlockWithAssignment;
  friends: Friend[];
  onAssign: (blockId: string, friendId: number) => void;
  onClear: (blockId: string) => void;
  onToggleSelector: (blockId: string) => void;
  selectorActive: boolean;
  activeFriendId: number | null;
}

function PageAssignmentBlock({
  block,
  friends,
  onAssign,
  onClear,
  onToggleSelector,
  selectorActive,
  activeFriendId,
}: PageAssignmentBlockProps) {
  const assignedFriend = block.assignedFriend;
  const color = assignedFriend ? getConsistentColor(assignedFriend.name) : undefined;
  const background = color ? hexToRgba(color, 0.25) : undefined;
  const { isOver, setNodeRef } = useDroppable({
    id: block.id,
    data: { type: 'page-block', blockId: block.id },
    disabled: !block.isAssignable,
  });
  const showDropTarget = isOver && block.isAssignable && activeFriendId !== null;

  const title = assignedFriend
    ? `${assignedFriend.name} · ${formatPageRange(block.pages)}`
    : block.isAssignable
      ? `Ziehe einen Namen auf ${formatPageRange(block.pages)}`
      : 'Nicht genug Seiten – es werden automatisch weitere Seiten hinzugefügt';

  return (
    <Tooltip content={title}>
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-lg border p-2 space-y-1 bg-white transition-all text-xs',
          assignedFriend ? 'shadow-sm' : 'border-dashed border-muted-foreground/40',
          !block.isAssignable && 'opacity-60',
          showDropTarget && 'ring-2 ring-primary',
        )}
        style={{
          backgroundColor: background,
          borderColor: color ? `#${color}` : undefined,
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {formatPageRange(block.pages)}
            </p>
            {assignedFriend ? (
              <p className="text-sm font-medium leading-tight truncate max-w-[120px]">{assignedFriend.name}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {block.isAssignable ? 'Verfügbar – drag & drop oder „Assign“' : 'Wartet auf zusätzliche Seiten'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {assignedFriend && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onClear(block.id)} aria-label="Remove assignment">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={() => onToggleSelector(block.id)}
              disabled={!block.isAssignable}
            >
              {assignedFriend ? 'Reassign' : 'Assign'}
            </Button>
          </div>
        </div>
        {selectorActive && block.isAssignable && (
          <div className="space-y-1 pt-1 border-t max-h-40 overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Kollaboratoren verfügbar.</p>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => onAssign(block.id, friend.id)}
                  className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted"
                >
                  {friend.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </Tooltip>
  );
}

function buildPageSpreads(totalPages: number): PageSpread[] {
  const spreads: PageSpread[] = [];
  for (let page = 1; page <= totalPages; page += 2) {
    const pages: PageInfo[] = [];
    for (let offset = 0; offset < 2; offset++) {
      const pageNumber = page + offset;
      if (pageNumber > totalPages) break;
      pages.push({
        pageNumber,
        type: getPageType(pageNumber, totalPages),
        canAssignUser: pageNumber >= CONTENT_START_PAGE && pageNumber < totalPages,
      });
    }
    spreads.push({
      id: `spread-${spreads.length}`,
      index: spreads.length,
      pages,
    });
  }
  return spreads;
}

function buildBlocks(
  totalPages: number,
  pagesPerUser: 1 | 2 | 3 | 4,
  pageAssignments: Record<number, number>,
  friends: Friend[],
): PageBlockWithAssignment[] {
  const assignablePages: PageInfo[] = [];
  for (let page = CONTENT_START_PAGE; page < totalPages; page++) {
    assignablePages.push({
      pageNumber: page,
      type: getPageType(page, totalPages),
      canAssignUser: true,
    });
  }

  const friendMap = new Map(friends.map((friend) => [friend.id, friend]));
  const totalBlocks = Math.ceil(assignablePages.length / pagesPerUser);
  const blocks: PageBlockWithAssignment[] = [];

  for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex++) {
    const sliceStart = blockIndex * pagesPerUser;
    const pages = assignablePages.slice(sliceStart, sliceStart + pagesPerUser);
    const assignedFriendId = pages.length > 0 ? pageAssignments[pages[0].pageNumber] : undefined;
    blocks.push({
      id: `block-${blockIndex}`,
      index: blockIndex,
      pages,
      isAssignable: pages.length === pagesPerUser,
      assignedFriend: assignedFriendId ? friendMap.get(assignedFriendId) : undefined,
    });
  }

  if (assignablePages.length % pagesPerUser === 0) {
    blocks.push({
      id: `block-${blocks.length}`,
      index: blocks.length,
      pages: [],
      isAssignable: false,
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      id: 'block-0',
      index: 0,
      pages: [],
      isAssignable: false,
    });
  }

  return blocks;
}

function assignFriendToBlock(
  state: TeamAssignmentState,
  blockIndex: number,
  friendId: number,
  pagesPerUser: number,
): TeamAssignmentState {
  const ensured = ensureBlockCapacity(state, blockIndex, pagesPerUser);
  const startPage = CONTENT_START_PAGE + blockIndex * pagesPerUser;
  const updatedAssignments: Record<number, number> = { ...ensured.pageAssignments };
  for (let offset = 0; offset < pagesPerUser; offset++) {
    const pageNumber = startPage + offset;
    if (pageNumber < ensured.totalPages) {
      updatedAssignments[pageNumber] = friendId;
    }
  }
  return {
    ...ensured,
    pageAssignments: updatedAssignments,
  };
}

function clearBlockAssignments(
  state: TeamAssignmentState,
  blockIndex: number,
  pagesPerUser: number,
): TeamAssignmentState {
  const startPage = CONTENT_START_PAGE + blockIndex * pagesPerUser;
  let changed = false;
  const updatedAssignments: Record<number, number> = { ...state.pageAssignments };
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

function ensureBlockCapacity(
  state: TeamAssignmentState,
  blockIndex: number,
  pagesPerUser: number,
): TeamAssignmentState {
  const requiredPages = (blockIndex + 1) * pagesPerUser;
  const currentContentPages = Math.max(state.totalPages - CONTENT_START_PAGE, 0);
  if (currentContentPages >= requiredPages) {
    return state;
  }
  let totalPages = state.totalPages;
  let contentPages = currentContentPages;
  while (contentPages < requiredPages) {
    totalPages += 2;
    contentPages += 2;
  }
  return {
    ...state,
    totalPages,
  };
}

function sanitizeAssignmentsForFriends(
  state: TeamAssignmentState,
  validFriendIds: Set<number>,
): TeamAssignmentState {
  const entries = Object.entries(state.pageAssignments).filter(([, assignedId]) =>
    validFriendIds.has(Number(assignedId)),
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
    nextState = assignFriendToBlock(nextState, index, friend.id, pagesPerUser);
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

function getPageTypeLabel(page: PageInfo): string {
  switch (page.type) {
    case 'back-cover':
      return 'Back Cover';
    case 'front-cover':
      return 'Front Cover';
    case 'inner-front-left':
      return 'Inner Front (L)';
    case 'inner-front-right':
      return 'Inner Front (R)';
    case 'inner-back':
      return 'Inner Back';
    default:
      return 'Content';
  }
}

function formatPageRange(pages: PageInfo[]): string {
  if (pages.length === 0) return 'Weitere Seiten';
  if (pages.length === 1) return `Seite ${pages[0].pageNumber}`;
  return `Seiten ${pages[0].pageNumber}–${pages[pages.length - 1].pageNumber}`;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getConsistentColor(value: string): string {
  const hash = Math.abs(hashString(value));
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

