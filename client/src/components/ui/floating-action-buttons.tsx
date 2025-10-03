import { Button } from './primitives/button';
import { PanelTop, Wrench } from 'lucide-react';

interface FloatingActionButtonsProps {
  editorBarVisible: boolean;
  toolbarVisible: boolean;
  onToggleEditorBar: () => void;
  onToggleToolbar: () => void;
}

export function FloatingActionButtons({
  editorBarVisible,
  toolbarVisible,
  onToggleEditorBar,
  onToggleToolbar
}: FloatingActionButtonsProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col md:hidden">
      <Button
        onClick={onToggleEditorBar}
        className="h-12 w-12 rounded-t-full rounded-b-none shadow-lg border-b-0"
        size="icon"
        variant={editorBarVisible ? "default" : "outline"}
      >
        <PanelTop className="h-5 w-5" />
      </Button>
      <Button
        onClick={onToggleToolbar}
        className="h-12 w-12 rounded-b-full rounded-t-none shadow-lg"
        size="icon"
        variant={toolbarVisible ? "default" : "outline"}
      >
        <Wrench className="h-5 w-5" />
      </Button>
    </div>
  );
}