import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { defineAbilitiesFor } from './define-abilities';
import type { AppAbility } from './types';
import { useEditor } from '../context/editor-context';
import { useAuth } from '../context/auth-context';

const defaultAbility = defineAbilitiesFor(null, null);

export const AbilityContext = createContext<AppAbility>(defaultAbility);

type AbilityProviderProps = {
  children: ReactNode;
};

export const AbilityProvider = ({ children }: AbilityProviderProps) => {
  const { state } = useEditor();
  const { user: authUser } = useAuth();
  // state.user kann verzögert gesetzt sein (SET_USER in useEffect), authUser als Fallback
  const userId = state.user?.id ?? authUser?.id ?? undefined;

  const currentPage = useMemo(() => {
    const page = state.currentBook?.pages[state.activePageIndex];
    if (!page) return null;
    const pageNum = page.pageNumber ?? -1;
    const pageNumNorm = typeof pageNum === 'number' ? pageNum : Number(pageNum);
    const assignments = (state.pageAssignments ?? {}) as Record<number | string, { id?: number } | null>;
    const assignedUser = assignments[pageNum] ?? assignments[pageNumNorm] ?? assignments[String(pageNum)] ?? null;
    let assignedUserId = typeof assignedUser?.id === 'number' ? assignedUser.id : null;
    // Autoren: assignedUserId nur setzen, wenn Seite in assignedPages (gilt für own_page und all_pages)
    const authorId = userId ?? null;
    if (state.userRole === 'author' && authorId) {
      const assigned = state.assignedPages ?? [];
      const isAssignedPage = assigned.some((p) => Number(p) === (Number.isNaN(pageNumNorm) ? -1 : pageNumNorm));
      if (isAssignedPage) {
        assignedUserId = authorId;
      }
    }
    return { assignedUserId, pageType: page.pageType };
  }, [state.currentBook, state.activePageIndex, state.pageAssignments, state.userRole, userId, state.pageAccessLevel, state.assignedPages]);

  const abilityUser = useMemo(
    () => ({
      id: userId,
      role: state.userRole ?? null,
      pageAccessLevel: state.pageAccessLevel,
      editorInteractionLevel: state.editorInteractionLevel
    }),
    [userId, state.userRole, state.pageAccessLevel, state.editorInteractionLevel]
  );

  const ability = useMemo(() => defineAbilitiesFor(abilityUser, currentPage), [abilityUser, currentPage]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
};

export const useAbility = () => useContext(AbilityContext);
