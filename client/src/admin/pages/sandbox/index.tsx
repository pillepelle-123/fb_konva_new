import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AbilityProvider } from '../../../abilities/ability-context';
import { EditorProvider, useEditor } from '../../../context/editor-context';
import { SandboxProvider, useSandbox } from '../../../context/sandbox-context';
import { createSandboxBook, buildElementColorUpdates, getEffectivePartOverrides } from '../../../utils/sandbox-utils';
import Toolbar from '../../../components/features/editor/toolbar';
import Canvas from '../../../components/features/editor/canvas';
import { ZoomProvider } from '../../../components/features/editor/canvas/zoom-context';
import ToolSettingsPanel, { type ToolSettingsPanelRef } from '../../../components/features/editor/tool-settings/tool-settings-panel';
import { StatusBar } from '../../../components/features/editor/status-bar';
import { AdminInfoPanel } from '../../../components/features/editor/admin-info-panel';
import QuestionSelectionHandler from '../../../components/features/editor/question-selection-handler';
import { fetchThemes, fetchLayouts, fetchColorPalettes, fetchSandboxPage } from '../../../services/api';
import { setThemesData, setColorPalettesData, setPageTemplatesData } from '../../../data/templates/templates-data';
import { toast } from 'sonner';

function SandboxEditorContent() {
  const { sandboxPageId } = useParams<{ sandboxPageId?: string }>();
  const { state, dispatch, canEditCanvas } = useEditor();
  const sandbox = useSandbox();
  const toolSettingsPanelRef = useRef<ToolSettingsPanelRef>(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(true);

  // Sync element colors when sandboxColors or partSlotOverrides change
  // Elements use explicit partSlotOverrides OR default palette parts; all update when slot colors change
  useEffect(() => {
    const book = state.currentBook;
    if (!book || book.id !== 'sandbox') return;
    const page = book.pages[state.activePageIndex];
    if (!page?.elements) return;

    for (const element of page.elements) {
      const effectiveOverrides = getEffectivePartOverrides(element, sandbox.state.partSlotOverrides);
      if (Object.keys(effectiveOverrides).length === 0) continue;

      const updates = buildElementColorUpdates(
        element as Record<string, unknown>,
        effectiveOverrides,
        sandbox.getColorForSlot
      );
      if (Object.keys(updates).length > 0) {
        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: element.id, updates } });
      }
    }
    // Only re-run when sandbox colors or overrides change (not when we dispatch element updates)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.state.sandboxColors, sandbox.state.partSlotOverrides]);

  // Sync page background when sandboxColors or pageSlotOverrides change
  useEffect(() => {
    const book = state.currentBook;
    if (!book || book.id !== 'sandbox') return;
    const page = book.pages[state.activePageIndex];
    if (!page?.background) return;

    const { pageSlotOverrides } = sandbox.state;
    const updates: Record<string, unknown> = {};

    if (pageSlotOverrides.pageBackground) {
      const color = sandbox.getColorForSlot(pageSlotOverrides.pageBackground);
      if (page.background.type === 'pattern') {
        updates.patternForegroundColor = color;
      } else {
        updates.value = color;
      }
    }
    if (pageSlotOverrides.pagePattern && page.background.type === 'pattern') {
      updates.patternBackgroundColor = sandbox.getColorForSlot(pageSlotOverrides.pagePattern);
    }

    if (Object.keys(updates).length > 0) {
      const newBackground = { ...page.background, ...updates };
      dispatch({
        type: 'UPDATE_PAGE_BACKGROUND',
        payload: { pageIndex: state.activePageIndex, background: newBackground, skipHistory: true },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox.state.sandboxColors, sandbox.state.pageSlotOverrides]);

  // Load themes, layout templates, and palettes from API on mount
  useEffect(() => {
    const loadTemplateData = async () => {
      try {
        const [themesRes, layoutsRes, palettesRes] = await Promise.all([
          fetchThemes(),
          fetchLayouts(),
          fetchColorPalettes(),
        ]);
        setThemesData(themesRes.themes || []);
        setPageTemplatesData(layoutsRes.templates || []);
        setColorPalettesData(palettesRes.palettes || []);
        dispatch({ type: 'LOAD_TEMPLATES', payload: layoutsRes.templates || [] });
        dispatch({ type: 'LOAD_COLOR_PALETTES', payload: palettesRes.palettes || [] });
      } catch (error) {
        console.error('Failed to load template data:', error);
      }
    };

    loadTemplateData();
  }, [dispatch]);

  // Set sandbox book on mount / when URL changes: load from API if sandboxPageId in URL, else create new
  useEffect(() => {
    const id = sandboxPageId ? parseInt(sandboxPageId, 10) : null;
    // Skip fetch if we already have this page loaded (e.g. after loading from dialog + navigate)
    if (id && !isNaN(id) && state.currentBook?.id === 'sandbox' && sandbox.state.currentSandboxPageId === id) {
      return;
    }
    if (id && !isNaN(id)) {
        fetchSandboxPage(id)
          .then((data) => {
            const page = data.page;
            if (!page) {
              toast.error('Ungültige Sandbox-Daten');
            dispatch({ type: 'SET_BOOK', payload: createSandboxBook() });
            sandbox.setCurrentSandboxPage(null);
            return;
          }
          const book = {
            id: 'sandbox',
            name: 'Sandbox',
            pageSize: 'A4',
            orientation: 'portrait',
            themeId: 'default',
            bookTheme: 'default',
            colorPaletteId: 'default',
            pages: [page],
          };
          dispatch({ type: 'SET_BOOK', payload: book });
          sandbox.loadSandboxState({
            sandboxColors: data.sandboxColors ?? sandbox.state.sandboxColors,
            partSlotOverrides: data.partSlotOverrides ?? {},
            pageSlotOverrides: data.pageSlotOverrides ?? {},
          });
          sandbox.setCurrentSandboxPage({ id: data.id, name: data.name });
        })
        .catch((err) => {
          console.error('Sandbox laden fehlgeschlagen:', err);
          toast.error('Sandbox-Seite konnte nicht geladen werden');
          dispatch({ type: 'SET_BOOK', payload: createSandboxBook() });
          sandbox.setCurrentSandboxPage(null);
        });
    } else {
      dispatch({ type: 'SET_BOOK', payload: createSandboxBook() });
      sandbox.setCurrentSandboxPage(null);
    }
  }, [sandboxPageId, dispatch, sandbox, state.currentBook?.id, sandbox.state.currentSandboxPageId]);

  // Grant full editor permissions for sandbox (Tool-Settings, Toolbar, etc. require editorInteractionLevel + abilities)
  useEffect(() => {
    if (state.currentBook?.id === 'sandbox') {
      const pageNumbers = state.currentBook.pages.map((p) => p.pageNumber ?? 0).filter(Boolean);
      dispatch({
        type: 'SET_USER_ROLE',
        payload: { role: 'publisher', assignedPages: pageNumbers.length ? pageNumbers : [1] },
      });
      dispatch({
        type: 'SET_USER_PERMISSIONS',
        payload: { pageAccessLevel: 'all_pages', editorInteractionLevel: 'full_edit_with_settings' },
      });
    }
  }, [state.currentBook?.id, dispatch]);

  // Admin panel toggle (Ctrl+I)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setAdminPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!state.currentBook) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>⟲</span>
          <p>Sandbox wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <ZoomProvider>
      <div className="h-full flex flex-col w-full min-w-0 overflow-hidden">
        <QuestionSelectionHandler />
        <div className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
          <div className="h-full flex flex-col bg-background min-w-0 w-full">
            <div className="flex-1 flex min-h-0 min-w-0 w-full overflow-hidden">
              {canEditCanvas() && <Toolbar />}
              <div className="flex-1 min-w-0 overflow-hidden bg-highlight">
                <Canvas />
              </div>
              {canEditCanvas() && <ToolSettingsPanel ref={toolSettingsPanelRef} isSandboxMode={true} />}
            </div>
            <StatusBar />
          </div>
        </div>
        <AdminInfoPanel
          open={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          isSandboxMode
        />
      </div>
    </ZoomProvider>
  );
}

export default function SandboxEditorPage() {
  return (
    <EditorProvider>
      <AbilityProvider>
        <SandboxProvider>
          <SandboxEditorContent />
        </SandboxProvider>
      </AbilityProvider>
    </EditorProvider>
  );
}
