import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { defineAbilitiesFor } from './define-abilities';
import type { AppAbility } from './types';
import { useEditor } from '../context/editor-context';

const defaultAbility = defineAbilitiesFor(null, null);

export const AbilityContext = createContext<AppAbility>(defaultAbility);

type AbilityProviderProps = {
  children: ReactNode;
};

export const AbilityProvider = ({ children }: AbilityProviderProps) => {
  const { state } = useEditor();

  const currentPage = useMemo(() => {
    const page = state.currentBook?.pages[state.activePageIndex];
    if (!page) return null;
    const assignedUser = state.pageAssignments?.[page.pageNumber ?? -1] ?? null;
    let assignedUserId = typeof assignedUser?.id === 'number' ? assignedUser.id : null;
    if (!assignedUserId && state.userRole === 'author' && state.user?.id) {
      if (state.assignedPages?.includes(page.pageNumber ?? -1)) {
        assignedUserId = state.user.id;
      }
    }
    return { assignedUserId, pageType: page.pageType };
  }, [state.currentBook, state.activePageIndex, state.pageAssignments, state.userRole, state.user?.id, state.assignedPages]);

  const abilityUser = useMemo(
    () => ({
      id: state.user?.id,
      role: state.userRole ?? null,
      pageAccessLevel: state.pageAccessLevel,
      editorInteractionLevel: state.editorInteractionLevel
    }),
    [state.user?.id, state.userRole, state.pageAccessLevel, state.editorInteractionLevel]
  );

  const ability = useMemo(() => defineAbilitiesFor(abilityUser, currentPage), [abilityUser, currentPage]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
};

export const useAbility = () => useContext(AbilityContext);
