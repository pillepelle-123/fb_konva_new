import { Button } from '../../../ui/primitives/button';
  import { Input } from '../../../ui/primitives/input';
  import { Label } from '../../../ui/primitives/label';
  import { Separator } from '../../../ui/primitives/separator';
  import { Palette } from 'lucide-react';
import { SettingsFormFooter } from './settings-form-footer';
import { useEditorSettings } from '../../../../hooks/useEditorSettings';
import { getGlobalThemeDefaults } from '../../../../utils/global-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/primitives/select';
import type { CanvasElement, EditorState } from '../../../../context/editor-context';

interface QrCodeSettingsFormProps {
  element: CanvasElement;
  state: EditorState;
  updateSetting: (key: string, value: unknown) => void;
  setShowColorSelector?: (type: string | null) => void;
  hasChanges: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function QrCodeSettingsForm({
  element,
  state,
  updateSetting,
  setShowColorSelector,
  hasChanges,
  onSave,
  onDiscard
}: QrCodeSettingsFormProps) {
  const { favoriteStrokeColors, addFavoriteStrokeColor, removeFavoriteStrokeColor } = useEditorSettings(state.currentBook?.id);

  const computedStyle = (() => {
    const currentPage = state.currentBook?.pages[state.activePageIndex];
    const pageTheme = currentPage?.themeId || currentPage?.background?.pageTheme;
    const bookTheme = state.currentBook?.themeId || state.currentBook?.bookTheme;
    const pageColorPaletteId = currentPage?.colorPaletteId;
    const bookColorPaletteId = state.currentBook?.colorPaletteId;
    const activeTheme = pageTheme || bookTheme || 'default';
    const effectivePaletteId = pageColorPaletteId || bookColorPaletteId;
    const defaults = getGlobalThemeDefaults(activeTheme, 'qr_code', effectivePaletteId);

    return {
      qrValue: element.qrValue || '',
      qrForegroundColor: element.qrForegroundColor || defaults.qrForegroundColor || '#111827',
      qrBackgroundColor: element.qrBackgroundColor || defaults.qrBackgroundColor || '#ffffff',
      qrErrorCorrection: element.qrErrorCorrection || defaults.qrErrorCorrection || 'M',
      qrMargin: element.qrMargin ?? defaults.qrMargin ?? 1,
      qrDotsStyle: element.qrDotsStyle || defaults.qrDotsStyle || 'square',
      qrCornerStyle: element.qrCornerStyle || defaults.qrCornerStyle || 'default'
    };
  })();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-w-0 overflow-y-auto space-y-2 p-2">
        <div className="space-y-1">
          <Label variant="xs">URL</Label>
          <Input
            type="url"
            placeholder="https://..."
            value={computedStyle.qrValue}
            onChange={(event) => updateSetting('qrValue', event.target.value)}
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <Label variant="xs">Dots Style</Label>
          <Select
            value={computedStyle.qrDotsStyle}
            onValueChange={(value) => updateSetting('qrDotsStyle', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="dots">Dots</SelectItem>
              <SelectItem value="rounded">Rounded</SelectItem>
              <SelectItem value="extra-rounded">Extra Rounded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label variant="xs">Corners Style</Label>
          <Select
            value={computedStyle.qrCornerStyle}
            onValueChange={(value) => updateSetting('qrCornerStyle', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="square-square">Square/Square</SelectItem>
              <SelectItem value="dot-dot">Dot/Dot</SelectItem>
              <SelectItem value="extra-rounded-dot">Extra Rounded/Dot</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="w-full min-w-0">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowColorSelector?.('element-qr-code-foreground')}
            className="w-full"
          >
            <Palette className="w-4 mr-2" />
            <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedStyle.qrForegroundColor }} />
            Foreground Color
          </Button>
        </div>

        <div className="w-full min-w-0">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowColorSelector?.('element-qr-code-background')}
            className="w-full"
          >
            <Palette className="w-4 mr-2" />
            <div className="w-4 h-4 mr-2 rounded border border-border" style={{ backgroundColor: computedStyle.qrBackgroundColor }} />
            Background Color
          </Button>
        </div>
      </div>

      <SettingsFormFooter hasChanges={hasChanges} onSave={onSave} onDiscard={onDiscard} />
    </div>
  );
}
