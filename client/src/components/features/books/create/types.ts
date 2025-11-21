import type { PageTemplate } from '../../../types/template-types';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';

export type Friend = {
  id: number;
  name: string;
  email?: string;
  role?: string;
};

export type InviteDraft = {
  id: string;
  name: string;
  email: string;
  tempFriendId?: number;
};

export type TeamAssignmentState = {
  totalPages: number;
  pageAssignments: Record<number, number>;
};

export const DEFAULT_ASSIGNMENT_PAGE_COUNT = 24;

export const getDefaultTeamAssignmentState = (): TeamAssignmentState => ({
  totalPages: DEFAULT_ASSIGNMENT_PAGE_COUNT,
  pageAssignments: {},
});

export type CustomQuestion = {
  id: string;
  text: string;
};

export type WizardState = {
  basic: {
    name: string;
    pageSize: BookPageSize;
    orientation: BookOrientation;
    presetId: string | null;
    startMode: 'preset' | 'assistant' | 'custom';
  };
  design: {
    layoutTemplate?: PageTemplate | null;
    leftLayoutTemplate?: PageTemplate | null;
    rightLayoutTemplate?: PageTemplate | null;
    mirrorLayout: boolean;
    pickLeftRight: boolean;
    randomizeLayout: boolean;
    themeId: string;
    paletteId: string | null; // null means "Theme's Default Palette"
  };
  team: {
    selectedFriends: Friend[];
    invites: InviteDraft[];
    enableGroupChat: boolean;
    pagesPerUser: 1 | 2 | 3 | 4;
    friendFacingPages: boolean;
    autoAssign: boolean;
    assignmentState: TeamAssignmentState;
  };
  questions: {
    selectedDefaults: string[];
    custom: CustomQuestion[];
  };
};

export type QuestionChoice = {
  id: string;
  text: string;
};

export const curatedQuestions: QuestionChoice[] = [
  { id: 'nickname', text: 'What is your nickname?' },
  { id: 'favoriteColor', text: 'What is your favorite color?' },
  { id: 'dreamJob', text: 'What is your dream job?' },
  { id: 'bestMemory', text: 'Share your favorite memory with me.' },
  { id: 'hiddenTalent', text: 'Do you have a hidden talent?' },
];

