import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../../../context/editor-context';
import { useAuth } from '../../../context/auth-context';
import { useSandboxOptional } from '../../../context/sandbox-context';
import { Button } from '../../ui/primitives/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../ui/overlays/dialog';
import { Input } from '../../ui/primitives/input';
import { Label } from '../../ui/primitives/label';
import { X, Layers, Save, Palette, Download, Upload } from 'lucide-react';
import { exportPageJsonToWindow } from '../../../utils/page-json-exporter';
import { cn } from '../../../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { getActiveTemplateIds } from '../../../utils/template-inheritance';
import { getGlobalThemeDefaults } from '../../../utils/global-themes';
import { calculatePageDimensions } from '../../../utils/template-utils';
import {
  extractThemeDefaults,
  buildPageSettingsFromBackground,
  generateThemeId,
  generatePaletteId,
} from '../../../utils/theme-palette-exporter';
import { createAdminTheme, createAdminColorPalette } from '../../../admin/services/themes-palettes-layouts';
import { fetchThemes, fetchColorPalettes, fetchSandboxPages, fetchSandboxPage, saveSandboxPage, updateSandboxPage } from '../../../services/api';
import { setThemesData, setColorPalettesData } from '../../../data/templates/templates-data';
import { colorPalettes } from '../../../data/templates/color-palettes';
import { OPENMOJI_STICKERS, getOpenMojiUrl } from '../../../data/templates/openmoji-stickers';
import { buildPartsFromElements, PALETTE_COLOR_SLOTS, type PaletteColorSlot } from '../../../utils/sandbox-utils';
import { ColorSelector } from './tool-settings/color-selector';
import { useEditorSettings } from '../../../hooks/useEditorSettings';
import { toast } from 'sonner';

interface AdminInfoPanelProps {
  open: boolean;
  onClose: () => void;
  isSandboxMode?: boolean;
}

function getBrushBounds(points: number[]) {
  let minX = points[0],
    maxX = points[0];
  let minY = points[1],
    maxY = points[1];
  for (let i = 2; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { width: maxX - minX, height: maxY - minY };
}

export function AdminInfoPanel({ open, onClose, isSandboxMode = false }: AdminInfoPanelProps) {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { state, dispatch } = useEditor();
  const sandbox = useSandboxOptional();
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);
  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [themeName, setThemeName] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [themePaletteId, setThemePaletteId] = useState('');
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isAddingElements, setIsAddingElements] = useState(false);
  const [paletteDialogOpen, setPaletteDialogOpen] = useState(false);
  const [paletteName, setPaletteName] = useState('');
  const [isSavingPalette, setIsSavingPalette] = useState(false);
  const [saveSandboxDialogOpen, setSaveSandboxDialogOpen] = useState(false);
  const [sandboxPageName, setSandboxPageName] = useState('');
  const [isSavingSandbox, setIsSavingSandbox] = useState(false);
  const [loadSandboxDialogOpen, setLoadSandboxDialogOpen] = useState(false);
  const [sandboxPagesList, setSandboxPagesList] = useState<{ id: number; name: string; updated_at: string }[]>([]);
  const [sandboxLoadFilter, setSandboxLoadFilter] = useState('');
  const [isLoadingSandboxList, setIsLoadingSandboxList] = useState(false);

  if (user?.role !== 'admin') {
    return null;
  }

  if (!open) {
    return null;
  }

  const currentBook = state.currentBook;
  const currentPage = currentBook?.pages[state.activePageIndex];
  const bookId = currentBook?.id ?? '—';
  const pageId = currentPage?.id ?? currentPage?.database_id ?? '—';
  const userId = user?.id ?? '—';

  const handleExportPageJson = () => {
    if (!currentPage) return;
    exportPageJsonToWindow(currentPage, `Page JSON – Book ${bookId} – Page ${pageId}`);
  };

  const handleAddSampleElements = () => {
    if (!currentBook || !currentPage) return;
    const activeTemplateIds = getActiveTemplateIds(currentPage, currentBook);
    const themeId = activeTemplateIds.themeId || 'default';
    const paletteId = activeTemplateIds.colorPaletteId ?? undefined;
    const canvasSize = calculatePageDimensions(
      currentBook.pageSize || 'A4',
      currentBook.orientation || 'portrait'
    );

    const margin = 120;
    const gap = 90;
    let y = margin;

    // QnA2
    const qna2Defaults = getGlobalThemeDefaults(themeId, 'qna2', paletteId) as Record<string, unknown>;
    const qna2Element = {
      id: uuidv4(),
      type: 'text' as const,
      x: margin,
      y,
      width: Math.min(700, canvasSize.width - margin * 2),
      height: 260,
      ...qna2Defaults,
      text: '',
      textType: 'qna2' as const,
      richTextSegments: [] as { text: string; bold?: boolean; italic?: boolean }[],
      textSettings: (qna2Defaults.textSettings as object) || {},
      sandboxDummyQuestion: 'Wie lautet die Beispiel-Frage?',
      sandboxDummyAnswer: 'Dies ist eine längere Beispiel-Antwort, die das Styling der Schriftart für Fragen und Antworten demonstrieren soll.',
    };
    dispatch({ type: 'ADD_ELEMENT', payload: qna2Element });
    y += 260 + gap;

    // Rect (shape)
    const rectDefaults = getGlobalThemeDefaults(themeId, 'rect', paletteId);
    const rectElement = {
      id: uuidv4(),
      type: 'rect' as const,
      x: margin,
      y,
      width: 260,
      height: 160,
      ...rectDefaults,
    };
    dispatch({ type: 'ADD_ELEMENT', payload: rectElement });
    y += 160 + gap;

    // Placeholder (image)
    const imageDefaults = getGlobalThemeDefaults(themeId, 'placeholder', paletteId);
    const placeholderElement = {
      id: uuidv4(),
      type: 'placeholder' as const,
      x: margin,
      y,
      width: 260,
      height: 200,
      ...imageDefaults,
    };
    dispatch({ type: 'ADD_ELEMENT', payload: placeholderElement });
    y += 200 + gap;

    // Sticker (OpenMoji)
    const stickerDefaults = getGlobalThemeDefaults(themeId, 'sticker', paletteId) as Record<string, unknown>;
    const firstOpenMoji = OPENMOJI_STICKERS[0];
    const stickerUrl = getOpenMojiUrl(firstOpenMoji.hexcode);
    const stickerElement = {
      id: uuidv4(),
      type: 'sticker' as const,
      x: margin,
      y,
      width: 200,
      height: 200,
      src: stickerUrl,
      stickerId: `openmoji-${firstOpenMoji.hexcode}`,
      stickerFormat: 'vector' as const,
      stickerFilePath: stickerUrl,
      stickerOriginalUrl: stickerUrl,
      ...stickerDefaults,
    };
    dispatch({ type: 'ADD_ELEMENT', payload: stickerElement });
    y += 200 + gap;

    // Brush (simple wavy line)
    const brushDefaults = getGlobalThemeDefaults(themeId, 'brush', paletteId);
    const brushPoints = [0, 0, 150, 30, 300, 0, 450, 20, 600, 15];
    const brushBounds = getBrushBounds(brushPoints);
    const brushElement = {
      id: uuidv4(),
      type: 'brush' as const,
      x: margin,
      y,
      width: brushBounds.width,
      height: brushBounds.height,
      points: brushPoints,
      ...brushDefaults,
    };
    dispatch({ type: 'ADD_ELEMENT', payload: brushElement });

    setIsAddingElements(true);
    setTimeout(() => setIsAddingElements(false), 500);
    toast.success('Beispiel-Elemente hinzugefügt');
  };

  const handleOpenThemeDialog = () => {
    if (!currentPage) return;
    const activeTemplateIds = getActiveTemplateIds(currentPage, currentBook);
    setThemePaletteId(activeTemplateIds.colorPaletteId || 'default');
    setThemeName(sandbox?.state.currentSandboxPageName ?? '');
    setThemeDescription('Theme aus Canvas erstellt');
    setThemeDialogOpen(true);
  };

  const handleOpenPaletteDialog = () => {
    setPaletteName(sandbox?.state.currentSandboxPageName ?? '');
    setPaletteDialogOpen(true);
  };

  const handleOpenSaveSandboxDialog = () => {
    setSandboxPageName(sandbox?.state.currentSandboxPageName ?? '');
    setSaveSandboxDialogOpen(true);
  };

  const handleSaveSandboxPage = async () => {
    if (!currentPage || !currentBook || !sandbox || !token) return;
    const name = sandboxPageName.trim() || 'Unbenannt';
    setIsSavingSandbox(true);
    try {
      const page = {
        ...currentPage,
        elements: currentPage.elements ?? [],
        background: currentPage.background,
      };
      const payload = {
        name,
        page,
        sandboxColors: sandbox.state.sandboxColors,
        partSlotOverrides: sandbox.state.partSlotOverrides,
        pageSlotOverrides: sandbox.state.pageSlotOverrides,
      };
      const currentId = sandbox.state.currentSandboxPageId;
      if (currentId != null) {
        await updateSandboxPage(currentId, payload);
        sandbox.setCurrentSandboxPage({ id: currentId, name });
      } else {
        const res = await saveSandboxPage(payload);
        sandbox.setCurrentSandboxPage({ id: res.id, name });
      }
      setSaveSandboxDialogOpen(false);
      toast.success(`Sandbox-Seite „${name}“ gespeichert`);
    } catch (err) {
      console.error('Sandbox speichern fehlgeschlagen:', err);
      toast.error('Sandbox-Seite konnte nicht gespeichert werden');
    } finally {
      setIsSavingSandbox(false);
    }
  };

  const handleOpenLoadSandboxDialog = async () => {
    setLoadSandboxDialogOpen(true);
    setSandboxLoadFilter('');
    setIsLoadingSandboxList(true);
    try {
      const pages = await fetchSandboxPages();
      setSandboxPagesList(pages);
    } catch (err) {
      console.error('Sandbox-Liste laden fehlgeschlagen:', err);
      toast.error('Sandbox-Seiten konnten nicht geladen werden');
      setSandboxPagesList([]);
    } finally {
      setIsLoadingSandboxList(false);
    }
  };

  const handleLoadSandboxPage = async (id: number) => {
    if (!sandbox || !state.currentBook) return;
    try {
      const data = await fetchSandboxPage(id);
      const page = data.page;
      if (!page) {
        toast.error('Ungültige Sandbox-Daten');
        return;
      }
      const book = {
        ...state.currentBook,
        id: 'sandbox',
        name: 'Sandbox',
        pageSize: state.currentBook.pageSize || 'A4',
        orientation: state.currentBook.orientation || 'portrait',
        themeId: state.currentBook.themeId || 'default',
        bookTheme: state.currentBook.bookTheme || 'default',
        colorPaletteId: state.currentBook.colorPaletteId || 'default',
        pages: [page],
      };
      dispatch({ type: 'SET_BOOK', payload: book });
      sandbox.loadSandboxState({
        sandboxColors: data.sandboxColors ?? sandbox.state.sandboxColors,
        partSlotOverrides: data.partSlotOverrides ?? {},
        pageSlotOverrides: data.pageSlotOverrides ?? {},
      });
      sandbox.setCurrentSandboxPage({ id: data.id, name: data.name });
      setLoadSandboxDialogOpen(false);
      toast.success(`Sandbox-Seite „${data.name}“ geladen`);
      navigate(`/admin/sandbox/${data.id}`, { replace: true });
    } catch (err) {
      console.error('Sandbox laden fehlgeschlagen:', err);
      toast.error('Sandbox-Seite konnte nicht geladen werden');
    }
  };

  const filteredSandboxPages = sandboxLoadFilter.trim()
    ? sandboxPagesList.filter(
        (p) =>
          p.name.toLowerCase().includes(sandboxLoadFilter.toLowerCase())
      )
    : sandboxPagesList;

  const handleSavePalette = async () => {
    if (!paletteName.trim() || !token || !sandbox) return;
    setIsSavingPalette(true);
    try {
      const parts = buildPartsFromElements(
        currentPage?.elements ?? [],
        sandbox.state.partSlotOverrides,
        sandbox.state.pageSlotOverrides
      );
      const paletteId = generatePaletteId(paletteName);
      await createAdminColorPalette(token, {
        id: paletteId,
        name: paletteName.trim(),
        colors: sandbox.state.sandboxColors,
        parts,
        contrast: 'AA',
      });
      const palettesRes = await fetchColorPalettes();
      setColorPalettesData(palettesRes.palettes || []);
      setPaletteDialogOpen(false);
      toast.success(`Palette „${paletteName}“ gespeichert`);
    } catch (err) {
      console.error('Palette speichern fehlgeschlagen:', err);
      toast.error('Palette konnte nicht gespeichert werden');
    } finally {
      setIsSavingPalette(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!currentPage || !currentBook || !themeName.trim() || !token) return;
    setIsSavingTheme(true);
    try {
      const activeTemplateIds = getActiveTemplateIds(currentPage, currentBook);
      const pageTheme = activeTemplateIds.themeId || 'default';
      const elementDefaults = extractThemeDefaults(
        currentPage.elements,
        currentPage.background,
        pageTheme
      );
      const pageSettings = buildPageSettingsFromBackground(currentPage.background);
      const themeId = generateThemeId(themeName);
      const paletteId = themePaletteId || activeTemplateIds.colorPaletteId || 'default';

      await createAdminTheme(token, {
        id: themeId,
        name: themeName.trim(),
        description: themeDescription.trim() || undefined,
        palette: paletteId,
        palette_id: paletteId,
        config: {
          pageSettings,
          elementDefaults,
        },
      });

      const themesRes = await fetchThemes();
      setThemesData(themesRes.themes || []);

      setThemeDialogOpen(false);
      toast.success(`Theme „${themeName}“ gespeichert`);
    } catch (err) {
      console.error('Theme speichern fehlgeschlagen:', err);
      toast.error('Theme konnte nicht gespeichert werden');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const palettes = colorPalettes;
  const hasThemeableElements =
    currentPage?.elements.some(
      (el) =>
        el.textType === 'qna' ||
        el.textType === 'qna2' ||
        el.type === 'rect' ||
        el.type === 'brush' ||
        el.type === 'circle' ||
        el.type === 'image' ||
        el.type === 'placeholder' ||
        el.type === 'sticker'
    ) ?? false;

  const sandboxColors: Record<PaletteColorSlot, string> = sandbox?.state.sandboxColors ?? ({} as Record<PaletteColorSlot, string>);
  const sandboxColorSlotOpen = sandbox?.state.sandboxColorSlotOpen ?? null;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-10 left-4 z-[1001]',
          'bg-black/80 rounded-xl text-white',
          'min-w-[220px] max-w-[320px]',
          'shadow-lg',
          'pointer-events-auto'
        )}
        style={{ isolation: 'isolate' }}
      >
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-white/95">
              {isSandboxMode ? 'Sandbox' : 'Admin Info'}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-0 text-white/80 hover:text-white hover:bg-white/10 -mr-1 -mt-0.5"
              onClick={onClose}
              aria-label="Schließen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isSandboxMode && sandbox ? (
            <>
              <div className="space-y-2 mb-3">
                <div className="text-xs text-white/70 mb-1">Farb-Slots</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PALETTE_COLOR_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className="h-10 rounded border-2 border-white/30 hover:border-white/60 transition-colors flex flex-col items-center justify-center p-1"
                      style={{ backgroundColor: sandboxColors[slot] || '#888' }}
                      onClick={() => sandbox.setSandboxColorSlotOpen(slot)}
                      title={slot}
                    >
                      <span className="text-[10px] text-white/90 truncate w-full text-center">
                        {slot}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleOpenSaveSandboxDialog}
                  disabled={!currentPage || !token}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Seite speichern
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleOpenLoadSandboxDialog}
                  disabled={!token}
                >
                  <Download className="h-3.5 w-3.5" />
                  Seite laden
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleOpenThemeDialog}
                  disabled={!currentPage || !hasThemeableElements}
                >
                  <Save className="h-3.5 w-3.5" />
                  Theme speichern
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleOpenPaletteDialog}
                  disabled={!currentPage}
                >
                  <Palette className="h-3.5 w-3.5" />
                  Palette speichern
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5 text-sm text-white/90 mb-3">
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">book_id</span>
                  <span className="font-mono text-xs truncate max-w-[140px]" title={String(bookId)}>
                    {String(bookId)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">page_id</span>
                  <span className="font-mono text-xs truncate max-w-[140px]" title={String(pageId)}>
                    {String(pageId)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">user_id</span>
                  <span className="font-mono text-xs truncate max-w-[140px]" title={String(userId)}>
                    {String(userId)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleAddSampleElements}
                  disabled={!currentPage || isAddingElements}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Beispiel-Elemente hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0 flex items-center justify-center gap-1.5"
                  onClick={handleOpenThemeDialog}
                  disabled={!currentPage || !hasThemeableElements}
                >
                  <Save className="h-3.5 w-3.5" />
                  Theme speichern
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-8 text-xs bg-white/15 hover:bg-white/25 text-white border-0"
                  onClick={handleExportPageJson}
                  disabled={!currentPage}
                >
                  Export Page JSON
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {isSandboxMode && sandbox && sandboxColorSlotOpen && (
        <Dialog
          open={!!sandboxColorSlotOpen}
          onOpenChange={(open) => !open && sandbox.setSandboxColorSlotOpen(null)}
        >
          <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col p-0" title={`Farbe: ${sandboxColorSlotOpen}`}>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Farbe: {sandboxColorSlotOpen}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
              <ColorSelector
                value={sandboxColors[sandboxColorSlotOpen] || '#000000'}
                onChange={(color) => sandbox.setSandboxColor(sandboxColorSlotOpen as PaletteColorSlot, color)}
                favoriteColors={favoriteStrokeColors}
                onAddFavorite={addFavoriteStrokeColor}
                onRemoveFavorite={removeFavoriteStrokeColor}
                onBack={() => sandbox.setSandboxColorSlotOpen(null)}
                showOpacitySlider={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={paletteDialogOpen} onOpenChange={setPaletteDialogOpen}>
        <DialogContent className="max-w-md" title="Palette speichern">
          <DialogHeader>
            <DialogTitle>Palette speichern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="palette-name">Name</Label>
              <Input
                id="palette-name"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder="z.B. Meine Palette"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaletteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSavePalette}
              disabled={!paletteName.trim() || isSavingPalette}
            >
              {isSavingPalette ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent className="max-w-md" title="Theme speichern">
          <DialogHeader>
            <DialogTitle>Theme speichern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Name</Label>
              <Input
                id="theme-name"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="z.B. Mein Theme"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-description">Beschreibung</Label>
              <Input
                id="theme-description"
                value={themeDescription}
                onChange={(e) => setThemeDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-palette">Palette</Label>
              <select
                id="theme-palette"
                value={themePaletteId}
                onChange={(e) => setThemePaletteId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {palettes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThemeDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveTheme}
              disabled={!themeName.trim() || isSavingTheme}
            >
              {isSavingTheme ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveSandboxDialogOpen} onOpenChange={setSaveSandboxDialogOpen}>
        <DialogContent className="max-w-md" title="Sandbox-Seite speichern">
          <DialogHeader>
            <DialogTitle>Sandbox-Seite speichern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sandbox-page-name">Name</Label>
              <Input
                id="sandbox-page-name"
                value={sandboxPageName}
                onChange={(e) => setSandboxPageName(e.target.value)}
                placeholder="z.B. Meine Sandbox-Seite"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveSandboxDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveSandboxPage}
              disabled={isSavingSandbox}
            >
              {isSavingSandbox ? 'Speichern…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadSandboxDialogOpen} onOpenChange={setLoadSandboxDialogOpen}>
        <DialogContent className="max-w-md" size="lg" title="Sandbox-Seite laden">
          <DialogHeader>
            <DialogTitle>Sandbox-Seite laden</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sandbox-load-filter">Filtern</Label>
              <Input
                id="sandbox-load-filter"
                value={sandboxLoadFilter}
                onChange={(e) => setSandboxLoadFilter(e.target.value)}
                placeholder="Nach Name filtern..."
              />
            </div>
            <div className="max-h-[300px] overflow-auto border rounded-md">
              {isLoadingSandboxList ? (
                <div className="p-4 text-center text-muted-foreground">Laden…</div>
              ) : filteredSandboxPages.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Keine Sandbox-Seiten gefunden.
                </div>
              ) : (
                <ul className="divide-y">
                  {filteredSandboxPages.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => handleLoadSandboxPage(p.id)}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.updated_at ? new Date(p.updated_at).toLocaleString('de-DE') : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
