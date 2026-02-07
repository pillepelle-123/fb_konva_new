import { useState, useEffect, useRef } from 'react';
import { Palette, Eye, RotateCcw } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Card } from '../../../ui/composites/card';
import { Separator } from '../../../ui';
import { colorPalettes, getPalettePartColor } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor } from '../../../../context/editor-context';
import { getGlobalTheme, getThemePageBackgroundColors, getThemePaletteId, getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { SelectorBase } from './selector-base';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  isBookLevel?: boolean;
  themeId?: string;
  onPreviewClick?: (palette: ColorPalette) => void;
}

export function PaletteSelector({ 
  onBack, 
  title, 
  isBookLevel = false, 
  themeId,
  onPreviewClick 
}: PaletteSelectorProps) {
  const { state, dispatch } = useEditor();
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  
  const currentPage = isBookLevel ? undefined : state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentPaletteId = activeTemplateIds.colorPaletteId;
  const currentPalette = currentPaletteId ? colorPalettes.find(p => p.id === currentPaletteId) || null : null;
  const pagePaletteOverrideId = !isBookLevel ? currentPage?.colorPaletteId || null : null;

  const effectiveThemeId = themeId || activeTemplateIds.themeId;
  const themePaletteId = effectiveThemeId ? getThemePaletteId(effectiveThemeId) : undefined;
  const themePalette = themePaletteId ? colorPalettes.find(p => p.id === themePaletteId) || null : null;
  
  const shouldUseThemePalette = isBookLevel ? !!themePalette : (pagePaletteOverrideId === null && !!themePalette);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(
    isBookLevel ? (shouldUseThemePalette ? themePalette : null) : (currentPalette || (shouldUseThemePalette ? themePalette : null))
  );
  const [useThemePalette, setUseThemePalette] = useState<boolean>(shouldUseThemePalette);
  const originalPageStateRef = useRef<Page | null>(null);

  // Capture complete page state on mount (deep clone)
  useEffect(() => {
    if (!originalPageStateRef.current && currentPage && !isBookLevel) {
      originalPageStateRef.current = structuredClone(currentPage);
    }
  }, []);

  useEffect(() => {
    if (isBookLevel) {
      setSelectedPalette(themePalette);
      setUseThemePalette(!!themePalette);
      return;
    }

    if (pagePaletteOverrideId === null) {
      setUseThemePalette(true);
      setSelectedPalette(themePalette);
    } else {
      setUseThemePalette(false);
      setSelectedPalette(currentPalette);
    }
  }, [isBookLevel, pagePaletteOverrideId, currentPaletteId, currentPalette, themePalette, themePaletteId]);

  const getEffectivePalette = (): ColorPalette | null => {
    if (isBookLevel) return useThemePalette ? themePalette : selectedPalette;
    return useThemePalette ? themePalette : selectedPalette;
  };

  const resetColorOverrides = () => {
    if (!state.currentBook) return;
    
    if (isBookLevel) {
      const bookTheme = state.currentBook.bookTheme || 'default';
      state.currentBook.pages.forEach((page, pageIndex) => {
        const elementIds = page.elements.filter(el => el.colorOverrides && Object.keys(el.colorOverrides).length > 0).map(el => el.id);
        if (elementIds.length > 0) {
          dispatch({ type: 'RESET_COLOR_OVERRIDES', payload: { elementIds, pageIndex } });
        }
      });
      dispatch({ type: 'SET_BOOK_COLOR_PALETTE', payload: null });
    } else {
      const currentPage = state.currentBook.pages[state.activePageIndex];
      if (currentPage) {
        const elementIds = currentPage.elements.filter(el => el.colorOverrides && Object.keys(el.colorOverrides).length > 0).map(el => el.id);
        if (elementIds.length > 0) {
          dispatch({ type: 'RESET_COLOR_OVERRIDES', payload: { elementIds, pageIndex: state.activePageIndex } });
        }
        dispatch({ type: 'SET_PAGE_COLOR_PALETTE', payload: { pageIndex: state.activePageIndex, colorPaletteId: null } });
      }
    }
  };

  const handlePreview = (palette: ColorPalette, isThemePalette: boolean) => {
    dispatch({
      type: 'SET_PAGE_COLOR_PALETTE',
      payload: { pageIndex: state.activePageIndex, colorPaletteId: isThemePalette ? null : palette.id }
    });
    dispatch({
      type: 'APPLY_COLOR_PALETTE',
      payload: { palette, pageIndex: state.activePageIndex, applyToAllPages: false }
    });
  };

  const handleCancel = () => {
    if (originalPageStateRef.current && !isBookLevel) {
      // Restore complete page state
      dispatch({
        type: 'RESTORE_PAGE_STATE',
        payload: {
          pageIndex: state.activePageIndex,
          pageState: originalPageStateRef.current
        }
      });
    }
    onBack();
  };

  const handleApply = () => {
    const paletteToApply = getEffectivePalette();
    if (!paletteToApply) return;

    if (isBookLevel) {
      dispatch({ type: 'SET_BOOK_COLOR_PALETTE', payload: useThemePalette ? null : paletteToApply.id });
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: { palette: paletteToApply, pageIndex: undefined, applyToAllPages: true }
      });
    } else {
      // Apply to all pages if checkbox is checked
      if (applyToEntireBook && state.currentBook) {
        state.currentBook.pages.forEach((_, pageIndex) => {
          dispatch({
            type: 'SET_PAGE_COLOR_PALETTE',
            payload: { pageIndex, colorPaletteId: useThemePalette ? null : paletteToApply.id }
          });
          dispatch({
            type: 'APPLY_COLOR_PALETTE',
            payload: { palette: paletteToApply, pageIndex, applyToAllPages: false }
          });
        });
      } else {
        // Apply to single page
        dispatch({ type: 'SET_PAGE_COLOR_PALETTE', payload: { pageIndex: state.activePageIndex, colorPaletteId: useThemePalette ? null : paletteToApply.id } });
        dispatch({
          type: 'APPLY_COLOR_PALETTE',
          payload: { palette: paletteToApply, pageIndex: state.activePageIndex, applyToAllPages: false }
        });
      }
    }

    const toolUpdates = {
      brush: { strokeColor: paletteToApply.colors.primary },
      line: { strokeColor: paletteToApply.colors.primary },
      rect: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      circle: { strokeColor: paletteToApply.colors.primary, fillColor: paletteToApply.colors.surface },
      text: { fontColor: paletteToApply.colors.primary, borderColor: paletteToApply.colors.secondary, backgroundColor: paletteToApply.colors.background }
    };

    Object.entries(toolUpdates).forEach(([tool, settings]) => {
      dispatch({ type: 'UPDATE_TOOL_SETTINGS', payload: { tool, settings } });
    });

    const historyMessage = applyToEntireBook 
      ? `Apply Color Palette to all pages: ${paletteToApply.name}`
      : `Apply ${isBookLevel ? 'Book' : 'Page'} Color Palette: ${paletteToApply.name}`;
    dispatch({ type: 'SAVE_TO_HISTORY', payload: historyMessage });
    onBack();
  };

  const renderPalettePreview = (palette: ColorPalette) => (
    <div className="flex h-3 w-full rounded overflow-hidden">
      {Object.values(palette.colors).map((color, index) => (
        <div key={index} className="flex-1" style={{ backgroundColor: color }} />
      ))}
    </div>
  );

  const allPalettes = themePalette ? [themePalette, ...colorPalettes.filter(p => p.id !== themePalette.id)] : colorPalettes;

  return (
    <SelectorBase
      title={<><Palette className="h-4 w-4" />{title}</>}
      items={allPalettes}
      selectedItem={getEffectivePalette()}
      onItemSelect={(palette) => {
        const isThemePalette = themePalette && palette.id === themePalette.id;
        if (isThemePalette) {
          setUseThemePalette(true);
          setSelectedPalette(themePalette);
        } else {
          setUseThemePalette(false);
          setSelectedPalette(palette);
        }
        if (!isBookLevel) handlePreview(palette, isThemePalette);
      }}
      getItemKey={(palette) => palette.id}
      onCancel={handleCancel}
      onApply={handleApply}
      canApply={true}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={!isBookLevel ? setApplyToEntireBook : undefined}
      headerActions={
        isBookLevel ? (
          <Button variant="outline" size="sm" onClick={resetColorOverrides} className="px-2 h-7 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        ) : undefined
      }
      renderItem={(palette, isActive) => (
        <Card className={`w-full p-2 transition-colors flex items-start gap-2 cursor-pointer ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex-1 text-left">
            <div className="text-xs mb-1">{themePalette && palette.id === themePalette.id ? "Theme's Default Palette" : palette.name}</div>
            {renderPalettePreview(palette)}
          </div>
          {onPreviewClick && (
            <Tooltip side="left" content="Preview Page with this Color Palette">
              <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onPreviewClick(palette); }} className="flex-shrink-0">
                <Eye className="h-4 w-4 text-gray-600" />
              </Button>
            </Tooltip>
          )}
        </Card>
      )}
      renderSelectedPreview={(selected) => (
        <div className="space-y-2 mt-3 w-full shrink-0">
          <Separator />
          <div className="flex items-start gap-2 px-2">
            <div className="flex-1 text-left">
              <div className="text-xs font-medium mb-1">
                {useThemePalette ? "Theme's Default Palette" : (selected?.name + ' (selected)' || 'No Palette Selected')}
              </div>
              {selected && renderPalettePreview(selected)}
            </div>
          </div>
        </div>
      )}
    />
  );
}
