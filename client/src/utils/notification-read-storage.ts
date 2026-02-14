/**
 * Persistente Speicherung der "gelesen"-Markierung von Notifications in localStorage.
 * Überlebt Login/Logout und Session-Reset (ohne Datenbank).
 */

const STORAGE_KEY_PREFIX = 'notification_read_';

export function getReadNotificationIds(userId: number): {
  conversationIds: Set<number>;
  pdfExportIds: Set<number>;
} {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return { conversationIds: new Set(), pdfExportIds: new Set() };
    const data = JSON.parse(raw);
    return {
      conversationIds: new Set(data.conversationIds ?? []),
      pdfExportIds: new Set(data.pdfExportIds ?? [])
    };
  } catch {
    return { conversationIds: new Set(), pdfExportIds: new Set() };
  }
}

function saveReadIds(userId: number, conversationIds: Set<number>, pdfExportIds: Set<number>) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${userId}`,
      JSON.stringify({
        conversationIds: Array.from(conversationIds),
        pdfExportIds: Array.from(pdfExportIds)
      })
    );
  } catch (e) {
    console.warn('Failed to save notification read state:', e);
  }
}

export function markConversationAsRead(userId: number, conversationId: number) {
  const { conversationIds, pdfExportIds } = getReadNotificationIds(userId);
  conversationIds.add(conversationId);
  saveReadIds(userId, conversationIds, pdfExportIds);
}

export function markPdfExportAsRead(userId: number, pdfExportId: number) {
  const { conversationIds, pdfExportIds } = getReadNotificationIds(userId);
  pdfExportIds.add(pdfExportId);
  saveReadIds(userId, conversationIds, pdfExportIds);
}

export function markPdfExportAsUnread(userId: number, pdfExportId: number) {
  const { conversationIds, pdfExportIds } = getReadNotificationIds(userId);
  pdfExportIds.delete(pdfExportId);
  saveReadIds(userId, conversationIds, pdfExportIds);
}

export function markAllAsRead(
  userId: number,
  conversationIds: number[],
  pdfExportIds: number[]
) {
  const existing = getReadNotificationIds(userId);
  conversationIds.forEach(id => existing.conversationIds.add(id));
  pdfExportIds.forEach(id => existing.pdfExportIds.add(id));
  saveReadIds(userId, existing.conversationIds, existing.pdfExportIds);
}

/** Zählt PDF-Exports aus der Liste, die noch nicht als gelesen markiert sind */
export function getUnreadPdfCount(userId: number, pdfExportIds: number[]): number {
  const { pdfExportIds: readIds } = getReadNotificationIds(userId);
  return pdfExportIds.filter(id => !readIds.has(id)).length;
}

/** Read keys für friend_inv, conv_inv (localStorage-only, kein Backend) */
const READ_KEYS_PREFIX = 'notification_read_keys_';

export function getReadNotificationKeys(userId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`${READ_KEYS_PREFIX}${userId}`);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set(data.keys ?? []);
  } catch {
    return new Set();
  }
}

export function toggleReadNotificationKey(userId: number, key: string): boolean {
  const current = getReadNotificationKeys(userId);
  const isRead = current.has(key);
  if (isRead) {
    current.delete(key);
  } else {
    current.add(key);
  }
  try {
    localStorage.setItem(
      `${READ_KEYS_PREFIX}${userId}`,
      JSON.stringify({ keys: Array.from(current) })
    );
  } catch (e) {
    console.warn('Failed to save read notification keys:', e);
  }
  return !isRead; // returns new state: true = now read
}

const HIDDEN_KEYS_PREFIX = 'notification_hidden_';

export function getHiddenNotificationKeys(userId: number): Set<string> {
  try {
    const raw = localStorage.getItem(`${HIDDEN_KEYS_PREFIX}${userId}`);
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    return new Set(data.keys ?? []);
  } catch {
    return new Set();
  }
}

export function addReadNotificationKeys(userId: number, keys: string[]) {
  const current = getReadNotificationKeys(userId);
  keys.forEach((k) => current.add(k));
  try {
    localStorage.setItem(
      `${READ_KEYS_PREFIX}${userId}`,
      JSON.stringify({ keys: Array.from(current) })
    );
  } catch (e) {
    console.warn('Failed to save read notification keys:', e);
  }
}

export function addHiddenNotificationKeys(userId: number, keys: string[]) {
  const current = getHiddenNotificationKeys(userId);
  keys.forEach(k => current.add(k));
  try {
    localStorage.setItem(
      `${HIDDEN_KEYS_PREFIX}${userId}`,
      JSON.stringify({ keys: Array.from(current) })
    );
  } catch (e) {
    console.warn('Failed to save hidden notification keys:', e);
  }
}
