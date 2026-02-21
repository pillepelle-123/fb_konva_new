import type { Page } from '../context/editor-context';
import { displayJSONInNewWindow } from './json-display';

/**
 * Erstellt eine tiefe Kopie eines Objekts für den Export (ohne Referenzen zu mutieren).
 */
function deepClone<T>(obj: T): T {
  try {
    const fn = (globalThis as typeof globalThis & { structuredClone?: (o: T) => T }).structuredClone;
    if (typeof fn === 'function') {
      return fn(obj);
    }
  } catch {
    // Fallback
  }
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Erzeugt die JSON-Repräsentation der aktuellen Seite, so wie sie beim "Save book"
 * in die Datenbank geschrieben würde.
 */
export function getPageAsSaveJson(page: Page): string {
  const pageForSave = deepClone(page);
  return JSON.stringify(pageForSave, null, 2);
}

/**
 * Exportiert die aktuelle Seite als JSON und öffnet sie in einem neuen Fenster.
 */
export function exportPageJsonToWindow(page: Page, title = 'Page JSON Export'): void {
  const json = getPageAsSaveJson(page);
  displayJSONInNewWindow(title, json);
}
