
**Plan: Vollständiges Undo/Redo-System mit Immer + Command Pattern**

**Phase 1: Foundation – Immer + History-Stack aufbauen**

**1.1 Setup Immer für Snapshots**

- Installiere: npm install immer
- Ersetze [cloneData(state.pageAssignments)](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") durch produce() von Immer, um Patches statt Voll‑Snapshots zu speichern
- **Datei**: [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Ziel**: Speicher‑effizienter, schnellere Snapshots

**1.2 History-Stack refaktorieren**

- Erweitere [HistoryState](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") um ein command‑Feld (enum oder string: 'ADD_PAGE' | 'DELETE_PAGE' | 'SET_BACKGROUND' etc.)
- Speichere auch **Patch‑Daten** optional (z. B. für Canvas‑Transforms: alte Position → neue Position)
- **Datei**: [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) – HistoryState‑Interface
- **Ziel**: Explizit nachverfolgbar, welche Aktion den Snapshot erzeugt hat

**Phase 2: Canvas-Aktionen in History erfassen**

**2.1 Command-Wrapper für Canvas-Transforms**

- Erstelle Datei: client/src/hooks/useCanvasCommand.ts
- Hook: useCanvasCommand(actionName: string) → gibt Dispatch‑Wrapper zurück
- **Verhalten**: Bei start (z. B. Drag starten) vorbereitend; bei end (Drag beenden) → [saveToHistory()](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") aufrufen
- **Ziel**: Drag/Resize/Rotate werden als **atomare** History‑Steps erfasst, nicht jedes Pixel

**2.2 Canvas-Item-Hinzufügen (aus Toolbar)**

- In ADD_ELEMENT Reducer‑Case: wende bereits [saveToHistory](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") an
- ✅ Prüfen: Datei [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) – sollte schon geschehen
- **Ziel**: Toolbar‑Klicks sind sichtbar in History

**2.3 Context-Menu-Aktionen (Delete/Duplicate/Paste/Group/Ungroup)**

- Suche: client/src/components/features/editor/context-menu.tsx
- Jede Action (Delete, Duplicate, Paste, Group, Ungroup) muss [saveToHistory()](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") einleiten
- **Beispiel**: DELETE_ELEMENT → vor Reducer‑Call [saveToHistory(state, 'Delete Element', ...)](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20")
- **Ziel**: Kontextmenü‑Aktionen sind in History sichtbar

**2.4 Canvas-Item-Settings speichern (nach „Save Changes")**

- Suche: client/src/components/features/editor/canvas-items/\*-settings-form.tsx
- Im [settings-form-footer.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) beim „Save"-Click: [dispatch({ type: 'SAVE_TO_HISTORY', payload: 'Update \[ItemType\] Settings' })](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Ziel**: Einstellungsänderungen an Canvas‑Items sind ein History‑Step

**Phase 3: Seiten- und Buch-Aktionen in History erfassen**

**3.1 Page-Actions (Add/Duplicate/Delete)**

- Suche: [page-actions.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- Buttons rufen bereits Reducer auf (z. B. 'ADD_PAGE_PAIR_AT_INDEX')
- ✅ Prüfen: Diese sollten bereits [saveToHistory](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") enthalten
- Falls nicht: In Reducer vor [return finalState](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") → [saveToHistory(finalState, 'Add Spread', ...)](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20")
- **Ziel**: Seiten‑Hinzufügen/Duplicate/Delete sind sichtbar

**3.2 Page-Explorer Add-Button**

- Suche: [page-explorer.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- Button für „Add Spread" → Dispatch 'ADD_PAGE_PAIR_AT_INDEX'
- ✅ Bereits integriert (vom Phase 3.1 Reducer)

**Phase 4: Settings (Background/Theme/Layout/Palette) mit Book-Scope**

**4.1 General-Settings (Background)**

- Suche: client/src/components/features/editor/settings/general-settings.tsx
- Bei Background‑Change → Dispatch mit [skipHistory: false](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") (default)
- Wenn „Apply to entire book" aktiv → [saveToHistory(state, 'Apply Background to Book', { cloneEntireBook: true })](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20")
- **Datei**: Reducer‑Cases 'UPDATE_PAGE_BACKGROUND', 'SET_BOOK_THEME', etc. in [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Ziel**: Book‑weite Settings sind als einzelne History‑Steps erfasst

**4.2 Selector-Theme**

- Suche: client/src/components/features/editor/settings/selector-theme.tsx
- Wenn „Apply to entire book" → Dispatch [{ type: 'SET_BOOK_THEME', skipHistory: false }](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- ✅ Bereits vorhanden; prüfen, ob [skipHistory](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") Logic richtig ist
- **Ziel**: Theme‑Änderungen (page √, book √) sind History‑Steps

**4.3 Selector-Layout**

- Suche: client/src/components/features/editor/settings/selector-layout.tsx
- Analog zu Theme: bei „Apply to entire book" → [{ type: 'SET_BOOK_LAYOUT_TEMPLATE', payload: ... }](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Ziel**: Layout‑Templates sind UR‑fähig

**4.4 Selector-Palette**

- Suche: client/src/components/features/editor/settings/selector-palette.tsx
- Analog: bei „Apply to entire book" → [{ type: 'SET_BOOK_COLOR_PALETTE', skipHistory: false }](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Ziel**: Palette‑Wechsel sind UR‑fähig

**Phase 5: Page Assignments in History**

**5.1 Page-Assignment-Popover Integration**

- Datei: [page-assignment-popover.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- Bei [onAssignUser()](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") → neu: [dispatch({ type: 'SAVE_ASSIGNMENT_TO_HISTORY', payload: { pageNumber, userId, userName } })](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- **Neuer Reducer-Case** in [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html):

case 'SAVE_ASSIGNMENT_TO_HISTORY':

const assignmentState = saveToHistory(state, \`Assign Page ${action.payload.pageNumber} to ${action.payload.userName}\`, {

affectedPageIndexes: \[action.payload.pageNumber - 1\]

});

const updatedAssignments = { ...assignmentState.pageAssignments, \[action.payload.pageNumber\]: ... };  
return { ...assignmentState, pageAssignments: updatedAssignments };

- **Ziel**: Page‑Assignments sind ein History‑Step pro Änderung

**Phase 6: History-Stack-Konsistenz absichern**

**6.1 Snapshot-Vollständigkeit sicherstellen**

- In [saveToHistory()](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20"): Stelle sicher, dass folgende State‑Teile immer gespeichert sind:
    - [pageAssignments](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ bereits gemacht)
    - [pagePagination](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ bereits gemacht)
    - [activePageIndex](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ beim UNDO/REDO restore)
    - [selectedElementIds](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ vorhanden)
    - [toolSettings](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ vorhanden)
    - [editorSettings](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) (✅ vorhanden)

**6.2 Historian-Index-Sync nach Book-Load**

- In [loadBook()](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") Callback: Nach [dispatch({ type: 'SET_BOOK', payload: ... })](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html)
- Prüfen: [state.historyIndex](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") sollte auf den neuen „Load Book"-Snapshot zeigen
- Falls nötig: [historyIndex](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") auf [state.history.length - 1](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") setzen
- **Ziel**: Nach Load → Undo geht zurück zum _vorherigen_ Buchzustand, nicht zu älteren Änderungen

**Phase 7: UI-Verbesserungen für UR**

**7.1 History-Dropdown mit besseren Labels**

- Datei: [undo-redo-controls.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20")
- Labels sollten aussagekräftig sein: ✅ bereits vorhanden
- Optional: Gruppiere transform‑Aktionen (z. B. 3× Resize hintereinander → „Move Item (3 changes)" oder als einzelne)

**7.2 Undo/Redo in Tastenkombinationen**

- Prüfen: Sind Ctrl+Z / Ctrl+Y (Cmd+Z / Cmd+Y) in [index.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html"%20\o%20") registriert?
- ✅ Sollte bereits vorhanden sein

**Phase 8: Testing & Validation**

**8.1 Test-Szenarien**

1.  Add Page → Undo → Redo
2.  Delete Page (mit Assignments) → Undo → Redo
3.  Change Theme (page) → Change Background → Undo 2× → Redo
4.  Apply Palette to Book → Undo → alle Seiten sollten alte Palette haben
5.  Drag Canvas Item → Resize → Rotate → Undo 3× (sollte jeweils einen Schritt rückgängig machen)
6.  Assign User → Change Page → Undo → User sollte wieder assigned sein
7.  Delete Element → Undo → Element ist restore, mit allen Settings

**8.2 Edge Cases**

- History‑Truncation (max 20 Schritte) → älteste sollten gelöscht werden
- History nach Book‑Load → keine "cross-book"-Undo möglich
- Gleichzeitige edits (Assignments + Canvas) → sollten in korrekter Reihenfolge sein

**Zusammenfassung der zu ändernden/neuen Dateien**

| **Phase** | **Datei** | **Action** |
| --- | --- | --- |
| 1   | [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | Immer setup, HistoryState erweitern |
| 2   | useCanvasCommand.ts (NEU) | Canvas-Transform Command-Wrapper |
| 2   | context-menu.tsx | History-Calls für Delete/Duplicate/Group/Ungroup |
| 2   | settings-form-footer.tsx | „Save Changes" → History-Call |
| 3   | page-actions.tsx | Prüfen/ergänzen saveToHistory-Calls |
| 3   | [page-explorer.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | Add-Button bereits integriert |
| 4   | general-settings.tsx, selector-\*.tsx | Book-Scope History-Calls |
| 5   | [page-assignment-popover.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | Neuer Reducer-Case + History-Call |
| 5   | [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | Neuer Case: SAVE_ASSIGNMENT_TO_HISTORY |
| 6   | [editor-context.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | Historian-Index-Sync in loadBook |
| 7   | [undo-redo-controls.tsx](vscode-file://vscode-app/c:/Users/pille/AppData/Local/Programs/Microsoft%20VS%20Code/bdd88df003/resources/app/out/vs/code/electron-browser/workbench/workbench.html) | UI-Verbesserungen |
| 8   | (Tests manuell oder mit Jest) | Alle Szenarien validieren |

Dieser Plan deckt dein gesamtes Zielbild ab. Sollen wir mit Phase 1 starten?