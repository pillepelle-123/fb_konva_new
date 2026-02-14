import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Palette, Eye } from 'lucide-react';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Card } from '../../../ui/composites/card';
import { Separator } from '../../../ui';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import type { ColorPalette } from '../../../../types/template-types';
import { useEditor, type Page } from '../../../../context/editor-context';
import { useSettingsPanel } from '../../../../hooks/useSettingsPanel';
import { getThemePaletteId } from '../../../../utils/global-themes';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { SelectorBase } from './selector-base';

interface PaletteSelectorProps {
  onBack: () => void;
  title: string;
  themeId?: string;
  onPreviewClick?: (palette: ColorPalette) => void;
}

export interface PaletteSelectorRef {
  discard: () => void;
}

export const PaletteSelector = forwardRef<PaletteSelectorRef, PaletteSelectorProps>(function PaletteSelector({ 
  onBack, 
  title, 
  themeId,
  onPreviewClick 
}, ref) {
  const { state, dispatch, canEditBookSettings } = useEditor();
  const canApplyToEntireBook = canEditBookSettings();
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentPaletteId = activeTemplateIds.colorPaletteId;
  const currentPalette = currentPaletteId ? colorPalettes.find(p => p.id === currentPaletteId) || null : null;
  const paletteOverrideId = currentPage?.colorPaletteId || null;

  const effectiveThemeId = themeId || activeTemplateIds.themeId;
  const themePaletteId = effectiveThemeId ? getThemePaletteId(effectiveThemeId) : undefined;
  const themePalette = themePaletteId ? colorPalettes.find(p => p.id === themePaletteId) || null : null;
  
  const shouldUseThemePalette = paletteOverrideId === null && !!themePalette;
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(
    currentPalette || (shouldUseThemePalette ? themePalette : null)
  );
  const [useThemePalette, setUseThemePalette] = useState<boolean>(shouldUseThemePalette);
  const originalPageStateRef = useRef<Page | null>(null);
  const hasAppliedRef = useRef(false);

  const getInitialEffectivePaletteId = () => {
    return paletteOverrideId === null ? (themePalette?.id ?? '__THEME__') : (currentPaletteId ?? null);
  };
  const initialEffectivePaletteIdRef = useRef<string | null>(getInitialEffectivePaletteId());

  useEffect(() => {
    if (!originalPageStateRef.current && currentPage) {
      originalPageStateRef.current = structuredClone(currentPage);
    }
  }, []);

  useEffect(() => {
    if (paletteOverrideId === null) {
      setUseThemePalette(true);
      setSelectedPalette(themePalette);
    } else {
      setUseThemePalette(false);
      setSelectedPalette(currentPalette);
    }
  }, [paletteOverrideId, currentPaletteId, currentPalette, themePalette, themePaletteId]);

  const getEffectivePalette = (): ColorPalette | null => {
    return useThemePalette ? themePalette : selectedPalette;
  };

  const getCurrentEffectivePaletteId = (): string | null => {
    const effective = getEffectivePalette();
    return useThemePalette ? (effective?.id ?? '__THEME__') : (effective?.id ?? null);
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

  const handleCancel = useCallback(() => {
    if (!hasAppliedRef.current && originalPageStateRef.current) {
      dispatch({
        type: 'RESTORE_PAGE_STATE',
        payload: {
          pageIndex: state.activePageIndex,
          pageState: originalPageStateRef.current
        }
      });
    }
    onBack();
  }, [dispatch, state.activePageIndex, onBack]);

  useImperativeHandle(ref, () => ({ discard: handleCancel }), [handleCancel]);
  const { panelRef } = useSettingsPanel(handleCancel);

  const handleApply = () => {
    const paletteToApply = getEffectivePalette();
    if (!paletteToApply) return;

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
      dispatch({ type: 'SET_PAGE_COLOR_PALETTE', payload: { pageIndex: state.activePageIndex, colorPaletteId: useThemePalette ? null : paletteToApply.id } });
      dispatch({
        type: 'APPLY_COLOR_PALETTE',
        payload: { palette: paletteToApply, pageIndex: state.activePageIndex, applyToAllPages: false }
      });
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
      : `Apply Color Palette: ${paletteToApply.name}`;
    dispatch({ type: 'SAVE_TO_HISTORY', payload: historyMessage });
    hasAppliedRef.current = true;
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
    <div ref={panelRef} className="h-full">
    <SelectorBase
      title={<><Palette className="h-4 w-4" />{title}</>}
      items={allPalettes}
      selectedItem={getEffectivePalette()}
      onItemSelect={(palette) => {
        const isThemePalette = Boolean(themePalette && palette.id === themePalette.id);
        if (isThemePalette) {
          setUseThemePalette(true);
          setSelectedPalette(themePalette);
        } else {
          setUseThemePalette(false);
          setSelectedPalette(palette);
        }
        handlePreview(palette, isThemePalette);
      }}
      getItemKey={(palette) => palette.id}
      onCancel={handleCancel}
      onApply={handleApply}
      canApply={getCurrentEffectivePaletteId() !== initialEffectivePaletteIdRef.current}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={canApplyToEntireBook ? setApplyToEntireBook : undefined}
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
          <div className="flex items-start p-2">
            <div className="flex-1 text-left">
              <div className="text-xs font-medium mb-1">
                {useThemePalette ? "Theme's Default Palette" : (selected?.name + ' (selected)' || 'No Palette Selected')}
              </div>
              {selected && renderPalettePreview(selected)}
            </div>
          </div>
          <div className="px-2">
            <Separator />
          </div>
        </div>
      )}
    />
    </div>
  );
});
