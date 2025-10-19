import { Button } from '../../ui/primitives/button';
import { PanelTop, PanelLeft, PanelRight } from 'lucide-react';

interface FloatingActionButtonsProps {
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  settingsPanelVisible: boolean;
  onToggleEditorBar: () => void;
  onToggleToolbar: () => void;
  onToggleSettingsPanel: () => void;
}

/* Button only in Mobile Mode to open toolbar and editor-bar */

export function FloatingActionButtons({
  editorBarVisible,
  toolbarVisible,
  settingsPanelVisible,
  onToggleEditorBar,
  onToggleToolbar,
  onToggleSettingsPanel
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-row md:hidden">
      <Button
        onClick={onToggleToolbar}
        className="h-12 w-12 rounded-l-full rounded-r-none shadow-lg border-r-0"
        size="icon"
        variant={toolbarVisible ? "default" : "outline"}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>
      <Button
        onClick={onToggleEditorBar}
        className="h-12 w-12  rounded-none shadow-lg border-r-0"
        size="icon"
        variant={editorBarVisible ? "default" : "outline"}
      >
        <PanelTop className="h-5 w-5" />
      </Button>

      <Button
        onClick={onToggleSettingsPanel}
        className="h-12 w-12 rounded-r-full rounded-l-none shadow-lg"
        size="icon"
        variant={settingsPanelVisible ? "default" : "outline"}
      >
        <PanelRight className="h-5 w-5" />
      </Button>
    </div>
  );
}