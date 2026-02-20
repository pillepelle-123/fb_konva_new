import { useEditor } from '../../../../context/editor-context';
import { Button } from '../../../ui/primitives/button';
import { ChevronLeft, PaintBucket, LayoutPanelLeft, Paintbrush2, Palette, MessagesSquare, Columns3Cog, UserCog, Hash } from 'lucide-react';
import { Separator } from '../../../ui/primitives/separator';
import { Label } from '../../../ui/primitives/label';
import { getGlobalThemeDefaults, getGlobalTheme, getThemePaletteId, getThemePageBackgroundColors } from '../../../../utils/global-themes';
import { PaletteSelector } from '../templates/selector-palette';
import { SelectorTheme } from '../templates/selector-theme';
import { SelectorLayout } from '../templates/selector-layout';
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { applyBackgroundImageTemplate } from '../../../../utils/background-image-utils';
import { pageTemplates } from '../../../../data/templates/page-templates';
import { colorPalettes } from '../../../../data/templates/color-palettes';
import { getActiveTemplateIds } from '../../../../utils/template-inheritance';
import { PageBackgroundSettings } from './page-background-settings';
import type { PageBackground } from '../../../../context/editor-context';
import { EditorSettings } from './editor-settings';
import { PageAssignmentSettings } from './page-assignment-settings';
import { PageNumberingSettings } from './page-numbering-settings';


interface GeneralSettingsProps {
  showColorSelector: string | null;
  setShowColorSelector: (value: string | null) => void;
  showBackgroundSettings: boolean;
  setShowBackgroundSettings: (value: boolean) => void;
  showPatternSettings: boolean;
  setShowPatternSettings: (value: boolean) => void;
  showEditorSettings?: boolean;
  setShowEditorSettings?: (value: boolean) => void;
  setShowBackgroundImageModal: (value: boolean) => void;
  showBackgroundImageTemplateSelector: boolean;
  setShowBackgroundImageTemplateSelector: (value: boolean) => void;
  onOpenTemplates: () => void;
  onOpenLayouts: () => void;
  onOpenThemes: () => void;
  onOpenPalettes: () => void;
  selectedBackgroundImageId?: string | null;
  onBackgroundImageSelect?: (imageId: string | null) => void;
  onApplyBackgroundImage?: () => void;
  isBackgroundApplyDisabled?: boolean;
  isBookChatAvailable?: boolean;
  onOpenBookChat?: () => void;
  showPalette?: boolean;
  setShowPalette?: (value: boolean) => void;
  showLayout?: boolean;
  setShowLayout?: (value: boolean) => void;
  showThemeSelector?: boolean;
  setShowThemeSelector?: (value: boolean) => void;
}

export interface GeneralSettingsRef {
  applyCurrentSelector: (applyToEntireBook?: boolean) => void;
  discardCurrentSelector: () => void;
}

export const GeneralSettings = forwardRef<GeneralSettingsRef, GeneralSettingsProps>((props, ref) => {
  const {
  showColorSelector,
  setShowColorSelector,
  showBackgroundSettings,
  setShowBackgroundSettings,
  showPatternSettings,
  setShowPatternSettings,
  setShowBackgroundImageModal,
  showBackgroundImageTemplateSelector,
  setShowBackgroundImageTemplateSelector,
    onOpenTemplates,
    onOpenLayouts,
    onOpenThemes,
    onOpenPalettes,
  selectedBackgroundImageId,
  onBackgroundImageSelect,
  onApplyBackgroundImage,
  isBackgroundApplyDisabled,
  isBookChatAvailable = false,
  onOpenBookChat,
  showPalette: externalShowPalette = false,
  setShowPalette: externalSetShowPalette,
  showLayout: externalShowLayout = false,
  setShowLayout: externalSetShowLayout,
  showThemeSelector: externalShowThemeSelector = false,
  setShowThemeSelector: externalSetShowThemeSelector,
  showEditorSettings: externalShowEditorSettings = false,
  setShowEditorSettings: externalSetShowEditorSettings
  } = props;
  const { state, dispatch, canViewPageSettings } = useEditor();
  // Use external state management if provided, otherwise fall back to local state
  const [localShowPalette, setLocalShowPalette] = useState(false);
  const [localShowLayout, setLocalShowLayout] = useState(false);
  const [localShowThemeSelector, setLocalShowThemeSelector] = useState(false);

  const showPalette = externalSetShowPalette ? externalShowPalette : localShowPalette;
  const setShowPalette = externalSetShowPalette || setLocalShowPalette;
  const showLayout = externalSetShowLayout ? externalShowLayout : localShowLayout;
  const setShowLayout = externalSetShowLayout || setLocalShowLayout;
  const showThemeSelector = externalSetShowThemeSelector ? externalShowThemeSelector : localShowThemeSelector;
  const setShowThemeSelector = externalSetShowThemeSelector || setLocalShowThemeSelector;
  const [localShowEditorSettings, setLocalShowEditorSettings] = useState(false);
  const showEditorSettings = externalSetShowEditorSettings ? (externalShowEditorSettings ?? false) : localShowEditorSettings;
  const setShowEditorSettings = externalSetShowEditorSettings || setLocalShowEditorSettings;
  const [showPageAssignmentSettings, setShowPageAssignmentSettings] = useState(false);
  const [showPageNumberingSettings, setShowPageNumberingSettings] = useState(false);
  
  // Keys to force remount when dialogs are opened
  const [layoutKey, setLayoutKey] = useState(0);
  const [themeKey, setThemeKey] = useState(0);
  const [paletteKey, setPaletteKey] = useState(0);

  const discardSelectorRef = useRef<{ discard: () => void } | null>(null);

  // Expose applyCurrentSelector and discardCurrentSelector to parent
  useImperativeHandle(ref, () => ({
    applyCurrentSelector: (applyToEntireBook?: boolean) => {
      // No longer needed - selectors handle apply internally
    },
    discardCurrentSelector: () => {
      discardSelectorRef.current?.discard?.();
    }
  }), []);


  const stripColorFields = (obj: any) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const lowerKey = key.toLowerCase();
      const isColorKey =
        lowerKey === 'fill' ||
        lowerKey === 'stroke' ||
        lowerKey.endsWith('color') ||
        lowerKey.endsWith('colors') ||
        (lowerKey.includes('color') && !lowerKey.includes('colorstop'));

      if (isColorKey) {
        delete obj[key];
        return;
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        stripColorFields(value);
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  };




  if (showEditorSettings) {
    return <EditorSettings />;
  }

  if (showPageAssignmentSettings) {
    return <PageAssignmentSettings onBack={() => setShowPageAssignmentSettings(false)} />;
  }

  if (showPageNumberingSettings) {
    return <PageNumberingSettings onBack={() => setShowPageNumberingSettings(false)} />;
  }
  
  if (showBackgroundSettings) {
    return (
      <PageBackgroundSettings
        showColorSelector={showColorSelector}
        setShowColorSelector={setShowColorSelector}
        showBackgroundSettings={showBackgroundSettings}
        setShowBackgroundSettings={setShowBackgroundSettings}
        showPatternSettings={showPatternSettings}
        setShowPatternSettings={setShowPatternSettings}
        setShowBackgroundImageModal={setShowBackgroundImageModal}
        showBackgroundImageTemplateSelector={showBackgroundImageTemplateSelector}
        setShowBackgroundImageTemplateSelector={setShowBackgroundImageTemplateSelector}
        selectedBackgroundImageId={selectedBackgroundImageId}
        onBackgroundImageSelect={onBackgroundImageSelect}
        onApplyBackgroundImage={onApplyBackgroundImage}
        isBackgroundApplyDisabled={isBackgroundApplyDisabled}
      />
    );
  }
  
  if (showPalette) {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageActiveTemplates = getActiveTemplateIds(currentPage, state.currentBook);
    return (
      <PaletteSelector
        ref={discardSelectorRef}
        key={`palette-${paletteKey}`}
        onBack={() => {
          setShowPalette(false);
          setPaletteKey(prev => prev + 1);
        }}
        title="Color Palette"
        themeId={pageActiveTemplates.themeId}
      />
    );
  }
  
  if (showLayout) {
    return (
      <SelectorLayout
        ref={discardSelectorRef}
        key={`layout-${layoutKey}`}
        onBack={() => {
          setShowLayout(false);
          setLayoutKey(prev => prev + 1);
        }}
      />
    );
  }
  
  if (showThemeSelector) {
    return (
      <SelectorTheme
        ref={discardSelectorRef}
        key={`theme-${themeKey}`}
        onBack={() => {
          setShowThemeSelector(false);
          setThemeKey(prev => prev + 1);
        }}
      />
    );
  }

  // Check if user can access any settings at all
  const canAccessAnySettings = state.editorInteractionLevel === 'full_edit_with_settings';
  const canAccessPageSettings = canViewPageSettings();
  const canShowBookChatButton = Boolean(isBookChatAvailable && onOpenBookChat && canAccessAnySettings);

  const currentPage = state.currentBook?.pages[state.activePageIndex];
  const activeTemplates = getActiveTemplateIds(currentPage, state.currentBook);

  const layout = activeTemplates.layoutTemplateId
    ? (pageTemplates.find(t => t.id === activeTemplates.layoutTemplateId) || null)
    : null;
  const theme = getGlobalTheme(activeTemplates.themeId);
  const paletteOverrideId = currentPage?.colorPaletteId ?? null;
  const effectivePaletteId = paletteOverrideId !== null
    ? paletteOverrideId
    : (activeTemplates.themeId ? (getThemePaletteId(activeTemplates.themeId) ?? null) : null);
  const palette = effectivePaletteId
    ? (colorPalettes.find(p => p.id === effectivePaletteId) || null)
    : null;

  return (
    <>
      <div className="space-y-3 p-2">
        {state.editorInteractionLevel === 'full_edit_with_settings' && (
          <>
            <div>
              <Label variant="xs" className="text-muted-foreground mb-2 block">General Settings</Label>
              <div className="space-y-1">
                {canShowBookChatButton && (
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => onOpenBookChat?.()}
                    className="w-full justify-start"
                  >
                    <MessagesSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => setShowEditorSettings(true)}
                  className="w-full justify-start"
                >
                  <Columns3Cog className="h-4 w-4 mr-2" />
                  Editor
                </Button>
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => setShowPageAssignmentSettings(true)}
                  className="w-full justify-start"
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Page Assignment
                </Button>
                <Button
                  variant="ghost_hover"
                  size="sm"
                  onClick={() => setShowPageNumberingSettings(true)}
                  className="w-full justify-start"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Page Numbering
                </Button>
              </div>
            </div>
            
          </>
        )}
        <Separator />
        <div>
          <Label variant="xs" className="text-muted-foreground mb-2 block">Styling Settings</Label>
          <div className="space-y-1">
            <Button
              variant="ghost_hover"
              size="sm"
              onClick={() => canAccessPageSettings && setShowBackgroundSettings(true)}
              className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!canAccessPageSettings}
            >
              <PaintBucket className="h-4 w-4 mr-2" />
              Background
            </Button>
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setLayoutKey(prev => prev + 1); // Force remount
                        setShowLayout(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <LayoutPanelLeft className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Layout</span>
                    {layout && (
                      <div className="ml-2 h-6 w-12 bg-gray-100 rounded border relative overflow-hidden shrink-0">
                        <div className="absolute inset-1 grid grid-cols-2 gap-1">
                          {layout.textboxes.slice(0, 4).map((_, i) => (
                            <div key={i} className="bg-blue-200 rounded-sm opacity-60" />
                          ))}
                        </div>
                      </div>
                    )}
                  </Button>
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setThemeKey(prev => prev + 1); // Force remount
                        setShowThemeSelector(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <Paintbrush2 className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Theme</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {theme?.name}
                    </span>
                  </Button>
                  <Button
                    variant="ghost_hover"
                    size="sm"
                    onClick={() => {
                      if (canAccessPageSettings) {
                        setPaletteKey(prev => prev + 1); // Force remount
                        setShowPalette(true);
                      }
                    }}
                    className={`w-full justify-start ${!canAccessPageSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!canAccessPageSettings}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">Color Palette</span>
                    {palette && (
                      <div className="ml-2 flex h-4 w-16 rounded overflow-hidden shrink-0 border border-gray-200">
                        {Object.values(palette.colors).map((color, index) => (
                          <div
                            key={index}
                            className="flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </Button>
          </div>
        </div>


      </div>
    </>
  );
});

GeneralSettings.displayName = 'GeneralSettings';