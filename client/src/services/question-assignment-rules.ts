/**
 * question-assignment-rules.ts
 *
 * Zentrale Regeln für die Zuweisung von Fragen an Textboxen:
 *
 * Regel 1 (primär): Dieselbe Frage darf einem User nur einmal pro Buch gestellt werden.
 *   - Gilt für alle Seiten, die einem User zugeordnet sind.
 *   - Eine Frage darf auf einer User-A-Seite kein Mal vorkommen, wenn sie bereits
 *     auf einer anderen User-A-Seite vorkommt.
 *
 * Regel 2 (nachgelagert): Dieselbe Frage darf auf einer Seite nur einmal vorkommen.
 *   - Gilt für Seiten ohne User-Zuordnung: max. eine Textbox pro Seite pro Frage.
 *   - Für User-zugeordnete Seiten ist dies in Regel 1 enthalten (einmal pro User = einmal pro Seite).
 */

/** Element mit questionId (question, qna, qna2) */
interface QuestionElement {
  id: string;
  textType?: string;
  questionId?: string;
}

/** Seite mit Elementen */
interface PageLike {
  pageNumber: number;
  elements: QuestionElement[];
}

/** User-Zuordnung pro Seite */
interface AssignedUserLike {
  id: number;
  name: string;
  email?: string;
}

/** Buch-Struktur (minimal für Regeln) */
interface BookLike {
  pages: PageLike[];
}

/** Kontext für die Prüfung einer Frage-Zuweisung an ein Element */
export interface QuestionAssignmentContext {
  /** Das Buch mit allen Seiten */
  book: BookLike | null | undefined;
  /** Page-Assignments: pageNumber -> User */
  pageAssignments: Record<number, AssignedUserLike>;
  /** ID des Elements, das bearbeitet wird (wird von der Prüfung ausgenommen) */
  elementId: string;
  /** Die Seite, auf der das Element liegt */
  elementPage: PageLike | null | undefined;
  /** PageNumber der Element-Seite */
  elementPageNumber: number;
}

/** Ergebnis der Validierung */
export interface QuestionAssignmentValidation {
  valid: boolean;
  reason?: string;
}

function isQuestionElement(el: QuestionElement): boolean {
  return Boolean(
    el.questionId &&
    (el.textType === 'question' || el.textType === 'qna' || el.textType === 'qna2')
  );
}

/**
 * Prüft, ob eine Frage einem Element zugewiesen werden darf.
 *
 * Regel 1: Dieselbe Frage darf einem User nur einmal pro Buch gestellt werden.
 * Regel 2: Dieselbe Frage darf auf einer Seite nur einmal vorkommen (für unzugeordnete Seiten).
 *
 * @param context Kontext mit Buch, Assignments, Element
 * @param questionId Die zu prüfende Frage-ID
 * @returns Validation-Ergebnis
 */
export function validateQuestionAssignment(
  context: QuestionAssignmentContext,
  questionId: string
): QuestionAssignmentValidation {
  const { book, pageAssignments, elementId, elementPage, elementPageNumber } = context;

  if (!book?.pages?.length) {
    return { valid: true };
  }

  const assignedUser = pageAssignments[elementPageNumber];

  // Regel 2 (für unzugeordnete Seiten): Frage darf auf dieser Seite nur einmal vorkommen
  if (!assignedUser) {
    if (!elementPage?.elements) {
      return { valid: true };
    }
    const hasQuestionElsewhereOnPage = elementPage.elements.some(
      (el) =>
        el.id !== elementId &&
        isQuestionElement(el) &&
        el.questionId === questionId
    );
    if (hasQuestionElsewhereOnPage) {
      return {
        valid: false,
        reason: 'Already on this page',
      };
    }
    return { valid: true };
  }

  // Regel 1 (für zugeordnete Seiten): Frage darf dem User im gesamten Buch nur einmal gestellt werden
  const userPages = Object.entries(pageAssignments)
    .filter(([, user]) => user?.id === assignedUser.id)
    .map(([pageNum]) => parseInt(pageNum, 10));

  for (const page of book.pages) {
    if (userPages.includes(page.pageNumber) && page.elements) {
      const hasQuestionElsewhere = page.elements.some(
        (el) =>
          el.id !== elementId &&
          isQuestionElement(el) &&
          el.questionId === questionId
      );
      if (hasQuestionElsewhere) {
        return {
          valid: false,
          reason: `Already used by ${assignedUser.name}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Prüft, ob eine Frage für ein Element verfügbar ist (Kurzform für validateQuestionAssignment).
 */
export function isQuestionAvailable(
  context: QuestionAssignmentContext,
  questionId: string
): boolean {
  return validateQuestionAssignment(context, questionId).valid;
}

/**
 * Gibt den Grund zurück, warum eine Frage nicht verfügbar ist, oder null wenn verfügbar.
 */
export function getQuestionUnavailableReason(
  context: QuestionAssignmentContext,
  questionId: string
): string | null {
  const result = validateQuestionAssignment(context, questionId);
  return result.valid ? null : (result.reason ?? 'This question cannot be selected.');
}

/**
 * Ermittelt alle Frage-IDs, die einem User bereits im Buch zugewiesen sind.
 * Wird z.B. für Paste-Konfliktprüfung und Page-Assignment verwendet.
 */
export function getQuestionIdsAssignedToUser(
  book: BookLike | null | undefined,
  pageAssignments: Record<number, AssignedUserLike>,
  userId: number
): Set<string> {
  const assigned = new Set<string>();
  if (!book?.pages) return assigned;

  const userPages = Object.entries(pageAssignments)
    .filter(([, user]) => user?.id === userId)
    .map(([pageNum]) => parseInt(pageNum, 10));

  for (const page of book.pages) {
    if (userPages.includes(page.pageNumber) && page.elements) {
      for (const el of page.elements) {
        if (isQuestionElement(el) && el.questionId) {
          assigned.add(el.questionId);
        }
      }
    }
  }
  return assigned;
}

/**
 * Prüft Konflikte beim Zuweisen eines Users zu einer Seite.
 * Gibt alle Fragen auf der Zielseite zurück, die der User bereits auf anderen Seiten hat.
 */
export interface PageAssignmentConflict {
  questionId: string;
  questionText: string;
  pageNumbers: number[];
}

export function checkUserQuestionConflictsForPageAssignment(
  book: BookLike | null | undefined,
  pageAssignments: Record<number, AssignedUserLike>,
  targetPageNumber: number,
  userId: number,
  getQuestionText: (questionId: string) => string
): PageAssignmentConflict[] {
  const conflicts: PageAssignmentConflict[] = [];
  if (!book?.pages) return conflicts;

  const targetPage = book.pages.find((p) => p.pageNumber === targetPageNumber);
  if (!targetPage?.elements) return conflicts;

  const targetQuestionIds = new Set<string>();
  const conflictMap = new Map<string, { questionText: string; pageNumbers: Set<number> }>();

  for (const el of targetPage.elements) {
    if (isQuestionElement(el) && el.questionId) {
      targetQuestionIds.add(el.questionId);
      if (!conflictMap.has(el.questionId)) {
        conflictMap.set(el.questionId, {
          questionText: getQuestionText(el.questionId) || 'Unknown question',
          pageNumbers: new Set<number>(),
        });
      }
    }
  }

  for (const page of book.pages) {
    if (page.pageNumber === targetPageNumber) continue;
    const assignedUser = pageAssignments[page.pageNumber];
    if (!assignedUser || assignedUser.id !== userId) continue;

    if (!page.elements) continue;
    for (const el of page.elements) {
      if (isQuestionElement(el) && el.questionId && targetQuestionIds.has(el.questionId)) {
        const entry = conflictMap.get(el.questionId);
        if (entry) {
          entry.pageNumbers.add(page.pageNumber);
        }
      }
    }
  }

  conflictMap.forEach((entry, questionId) => {
    if (entry.pageNumbers.size > 0) {
      conflicts.push({
        questionId,
        questionText: entry.questionText,
        pageNumbers: Array.from(entry.pageNumbers).sort((a, b) => a - b),
      });
    }
  });

  return conflicts;
}
