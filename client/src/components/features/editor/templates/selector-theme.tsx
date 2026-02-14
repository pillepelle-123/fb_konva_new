import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Eye, Paintbrush2 } from 'lucide-react';
import { useSettingsPanel } from '../../../../hooks/useSettingsPanel';
import { GLOBAL_THEMES, getGlobalTheme, getThemePageBackgroundColors, getThemePaletteId } from '../../../../utils/global-themes';
import { SelectorBase } from './selector-base';
import { Card } from '../../../ui/composites/card';
import { Button } from '../../../ui/primitives/button';
import { Tooltip } from '../../../ui/composites/tooltip';
import { Separator } from '../../../ui';
import { useEditor } from '../../../../context/editor-context';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import type { PageBackground, Page } from '../../../../context/editor-context';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';

interface SelectorThemeProps {
  onBack: () => void;
}

export interface SelectorThemeRef {
  discard: () => void;
}

export const SelectorTheme = forwardRef<SelectorThemeRef, SelectorThemeProps>(function SelectorTheme({ onBack }, ref) {
  const { state, dispatch, canEditBookSettings } = useEditor();
  const canApplyToEntireBook = canEditBookSettings();
  
  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const activeTemplateIds = getActiveTemplateIds(currentPage, state.currentBook);
  const currentTheme = activeTemplateIds.themeId;
  
  const pageHasCustomTheme = currentPage 
    ? Object.prototype.hasOwnProperty.call(currentPage, 'themeId') && 
      currentPage.themeId !== undefined && 
      currentPage.themeId !== null
    : false;

  const deriveSelectedTheme = () => {
    return pageHasCustomTheme ? (currentTheme || 'default') : '__BOOK_THEME__';
  };

  const initialThemeRef = useRef<string>(deriveSelectedTheme());
  const [selectedTheme, setSelectedTheme] = useState<string>(initialThemeRef.current);
  const [applyToEntireBook, setApplyToEntireBook] = useState(false);
  const originalPageStateRef = useRef<Page | null>(null);
  const hasAppliedRef = useRef(false);

  // Capture complete page state on mount (deep clone)
  useEffect(() => {
    if (!originalPageStateRef.current && currentPage) {
      originalPageStateRef.current = structuredClone(currentPage);
    }
  }, []);

  const themes = GLOBAL_THEMES.map(theme => ({ id: theme.id, ...getGlobalTheme(theme.id)! }));
  const allThemes = [{ id: '__BOOK_THEME__', name: 'Book Theme', description: 'Inherit from book' }, ...themes];
  const selectedThemeObj = allThemes.find(t => t.id === selectedTheme) || null;
  const activeThemeObj = getGlobalTheme(selectedTheme === '__BOOK_THEME__' ? (state.currentBook?.bookTheme || 'default') : selectedTheme);

  const buildBackground = (themeId: string, pageIndex: number): PageBackground => {
    const theme = getGlobalTheme(themeId);
    if (!theme) return { type: 'color', value: '#ffffff', opacity: 1 };

    const page = state.currentBook?.pages[pageIndex];
    const activePaletteId = page?.colorPaletteId || state.currentBook?.colorPaletteId || null;
    const currentThemeId = page?.themeId || state.currentBook?.bookTheme || 'default';
    const currentThemeDefaultPaletteId = getThemePaletteId(currentThemeId);
    const isUsingThemeDefaultPalette = activePaletteId === currentThemeDefaultPaletteId;

    let paletteToUse;
    if (isUsingThemeDefaultPalette) {
      const newThemeDefaultPaletteId = getThemePaletteId(themeId);
      paletteToUse = newThemeDefaultPaletteId ? colorPalettes.find(p => p.id === newThemeDefaultPaletteId) || null : null;
    } else {
      paletteToUse = activePaletteId ? colorPalettes.find(p => p.id === activePaletteId) || null : null;
    }

    const pageColors = getThemePageBackgroundColors(themeId, paletteToUse || undefined);
    const backgroundOpacity = theme.pageSettings.backgroundOpacity || 1;

    const backgroundImageConfig = theme.pageSettings.backgroundImage;
    if (backgroundImageConfig?.enabled && backgroundImageConfig.templateId) {
      const imageBackground = applyBackgroundImageTemplate(backgroundImageConfig.templateId, {
        imageSize: backgroundImageConfig.size,
        imageRepeat: backgroundImageConfig.repeat,
        imagePosition: backgroundImageConfig.position,
        imageWidth: backgroundImageConfig.width,
        opacity: backgroundImageConfig.opacity ?? backgroundOpacity,
        backgroundColor: pageColors.backgroundColor
      });
      if (imageBackground) return { ...imageBackground, pageTheme: themeId };
    }

    if (theme.pageSettings.backgroundPattern?.enabled) {
      return {
        type: 'pattern',
        value: theme.pageSettings.backgroundPattern.style,
        opacity: backgroundOpacity,
        pageTheme: themeId,
        patternSize: theme.pageSettings.backgroundPattern.size,
        patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
        patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity,
        patternForegroundColor: pageColors.backgroundColor,
        patternBackgroundColor: pageColors.patternBackgroundColor
      };
    }

    return { type: 'color', value: pageColors.backgroundColor, opacity: backgroundOpacity, pageTheme: themeId };
  };

  const handlePreview = (themeId: string) => {
    const isBookThemeSelection = themeId === '__BOOK_THEME__';
    const resolvedThemeId = isBookThemeSelection ? (state.currentBook?.bookTheme || 'default') : themeId;

    dispatch({
      type: 'SET_PAGE_THEME',
      payload: { pageIndex: state.activePageIndex, themeId: isBookThemeSelection ? '__BOOK_THEME__' : themeId }
    });

    dispatch({
      type: 'APPLY_THEME_TO_ELEMENTS',
      payload: { pageIndex: state.activePageIndex, themeId: resolvedThemeId, skipHistory: true, preserveColors: true }
    });

    const theme = getGlobalTheme(resolvedThemeId);
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    if (theme && currentPage) {
      const activePaletteId = currentPage.colorPaletteId || state.currentBook?.colorPaletteId || null;
      const currentThemeId = currentPage.themeId || state.currentBook?.bookTheme || 'default';
      const currentThemeDefaultPaletteId = getThemePaletteId(currentThemeId);
      const isUsingThemeDefaultPalette = activePaletteId === currentThemeDefaultPaletteId;

      if (isUsingThemeDefaultPalette) {
        const newThemeDefaultPaletteId = getThemePaletteId(resolvedThemeId);
        dispatch({
          type: 'SET_PAGE_COLOR_PALETTE',
          payload: { pageIndex: state.activePageIndex, colorPaletteId: newThemeDefaultPaletteId || null }
        });
      }

      const newBackground = buildBackground(resolvedThemeId, state.activePageIndex);
      dispatch({ type: 'UPDATE_PAGE_BACKGROUND', payload: { pageIndex: state.activePageIndex, background: newBackground } });
    }
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
    if (!selectedTheme) return;

    const isBookThemeSelection = selectedTheme === '__BOOK_THEME__';
    const resolvedThemeId = isBookThemeSelection ? (state.currentBook?.bookTheme || 'default') : selectedTheme;

    if (applyToEntireBook && state.currentBook) {
        state.currentBook.pages.forEach((page, pageIndex) => {
          dispatch({
            type: 'SET_PAGE_THEME',
            payload: { pageIndex, themeId: isBookThemeSelection ? '__BOOK_THEME__' : selectedTheme }
          });

          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: { pageIndex, themeId: resolvedThemeId, skipHistory: true, preserveColors: true }
          });

          const theme = getGlobalTheme(resolvedThemeId);
          if (theme && page) {
            const activePaletteId = page.colorPaletteId || state.currentBook?.colorPaletteId || null;
            const currentThemeId = page.themeId || state.currentBook?.bookTheme || 'default';
            const currentThemeDefaultPaletteId = getThemePaletteId(currentThemeId);
            const isUsingThemeDefaultPalette = activePaletteId === currentThemeDefaultPaletteId;

            if (isUsingThemeDefaultPalette) {
              const newThemeDefaultPaletteId = getThemePaletteId(resolvedThemeId);
              dispatch({
                type: 'SET_PAGE_COLOR_PALETTE',
                payload: { pageIndex, colorPaletteId: newThemeDefaultPaletteId || null }
              });
            }

            const newBackground = buildBackground(resolvedThemeId, pageIndex);
            dispatch({ type: 'UPDATE_PAGE_BACKGROUND', payload: { pageIndex, background: newBackground } });
          }
        });

        const historyLabel = selectedTheme === '__BOOK_THEME__' ? 'Book Theme' : getGlobalTheme(selectedTheme)?.name || selectedTheme;
        dispatch({ type: 'SAVE_TO_HISTORY', payload: `Apply Theme "${historyLabel}" to all pages` });
        hasAppliedRef.current = true;
        onBack();
        return;
    }

    dispatch({
      type: 'SET_PAGE_THEME',
      payload: { pageIndex: state.activePageIndex, themeId: isBookThemeSelection ? '__BOOK_THEME__' : selectedTheme }
    });

    dispatch({
      type: 'APPLY_THEME_TO_ELEMENTS',
      payload: { pageIndex: state.activePageIndex, themeId: resolvedThemeId, skipHistory: true, preserveColors: true }
    });

    const theme = getGlobalTheme(resolvedThemeId);
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    if (theme && currentPage) {
      const activePaletteId = currentPage.colorPaletteId || state.currentBook?.colorPaletteId || null;
      const currentThemeId = currentPage.themeId || state.currentBook?.bookTheme || 'default';
      const currentThemeDefaultPaletteId = getThemePaletteId(currentThemeId);
      const isUsingThemeDefaultPalette = activePaletteId === currentThemeDefaultPaletteId;

      if (isUsingThemeDefaultPalette) {
        const newThemeDefaultPaletteId = getThemePaletteId(resolvedThemeId);
        dispatch({
          type: 'SET_PAGE_COLOR_PALETTE',
          payload: { pageIndex: state.activePageIndex, colorPaletteId: newThemeDefaultPaletteId || null }
        });
      }

      const newBackground = buildBackground(resolvedThemeId, state.activePageIndex);
      dispatch({ type: 'UPDATE_PAGE_BACKGROUND', payload: { pageIndex: state.activePageIndex, background: newBackground } });
    }

    const historyLabel = selectedTheme === '__BOOK_THEME__' ? 'Book Theme' : getGlobalTheme(selectedTheme)?.name || selectedTheme;
    dispatch({ type: 'SAVE_TO_HISTORY', payload: `Apply Theme "${historyLabel}"` });
    hasAppliedRef.current = true;
    onBack();
  };

  return (
    <div ref={panelRef} className="h-full">
    <SelectorBase
      title={<><Paintbrush2 className="h-4 w-4" />Theme</>}
      items={allThemes}
      selectedItem={selectedThemeObj}
      onItemSelect={(theme) => {
        setSelectedTheme(theme.id);
        handlePreview(theme.id);
      }}
      getItemKey={(theme) => theme.id}
      onCancel={handleCancel}
      onApply={handleApply}
      canApply={selectedTheme !== initialThemeRef.current}
      applyToEntireBook={applyToEntireBook}
      onApplyToEntireBookChange={canApplyToEntireBook ? setApplyToEntireBook : undefined}
      renderItem={(theme, isActive) => (
        <Card
          className={`w-full p-3 transition-colors flex items-center justify-between gap-2 cursor-pointer ${
            isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex-1 text-left">
            <div className="font-medium text-sm">{theme.name}</div>
            <div className="text-xs text-gray-600 mt-1">{theme.description || 'Theme styling'}</div>
          </div>
        </Card>
      )}
      renderSelectedPreview={(selected) => (
        <div className="space-y-2 mt-3 w-full shrink-0">
          <Separator />
          <div className="flex items-start gap-2 px-2">
            <div className="flex-1 text-left">
              <div className="text-xs font-medium mb-1">{activeThemeObj?.name} (selected)</div>
              <div className="text-xs text-gray-600">{activeThemeObj?.description || 'Theme styling'}</div>
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
