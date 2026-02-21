import { useEffect } from 'react';
import { EditorPreviewProvider } from './editor-preview-provider';
import Canvas from '../canvas/canvas';
import { ZoomProvider } from '../canvas/zoom-context';
import type { PageTemplate } from '../../../../types/template-types';
import type { BookOrientation, BookPageSize } from '../../../../constants/book-formats';

type MiniEditorCanvasProps = {
  pageSize: BookPageSize;
  orientation: BookOrientation;
  themeId: string;
  paletteId: string;
  baseTemplate: PageTemplate | null;
  pickLeftRight: boolean;
  leftTemplate?: PageTemplate | null;
  rightTemplate?: PageTemplate | null;
  mirrorRight: boolean;
  className?: string;
};

export default function MiniEditorCanvas(props: MiniEditorCanvasProps) {
  useEffect(() => {
    // Ensure preview quality for backgrounds for faster loads in wizard
    window.dispatchEvent(
      new CustomEvent('setBackgroundQuality', { detail: { mode: 'preview' } })
    );
  }, []);

  // Trigger fitToView when modal opens (when className changes to include h-full)
  useEffect(() => {
    const isModal = props.className?.includes('h-full');
    if (isModal) {
      // Dispatch event to trigger fitToView in Canvas component
      // Use a small delay to ensure the container has rendered
      const timeoutId = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('triggerFitToView'));
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [props.className]);

  // Einmalig fitToView bei Mount und wenn Theme, Palette oder Layout sich ändern
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('triggerFitToView'));
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [props.pageSize, props.orientation, props.themeId, props.paletteId, props.baseTemplate, props.leftTemplate, props.rightTemplate]);

  const isModal = props.className?.includes('h-full');

  return (
    <div className={`rounded-2xl bg-white shadow-sm border p-2 ${props.className ?? ''} ${!isModal ? 'h-[350px]' : 'h-full'} flex flex-col`}>
      {!isModal && <div className="text-sm font-semibold mb-3 flex-shrink-0">Live Preview</div>}
      <div
        className="w-full mini-editor-preview flex-1 min-h-0"
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 12,
          pointerEvents: 'none',
        }}
      >
        {/* Hide Canvas HTML badges and lock banner inside the mini preview */}
        <style>
          {`
            .mini-editor-preview div.absolute.z-20 { display: none !important; }
            .mini-editor-preview .pointer-events-none.absolute.z-20 { display: none !important; }
          `}
        </style>
        <EditorPreviewProvider
          pageSize={props.pageSize}
          orientation={props.orientation}
          themeId={props.themeId}
          paletteId={props.paletteId}
          baseTemplate={props.baseTemplate}
          pickLeftRight={props.pickLeftRight}
          leftTemplate={props.leftTemplate}
          rightTemplate={props.rightTemplate}
          mirrorRight={props.mirrorRight}
          allowInteractions={false}
        >
          <ZoomProvider initialZoom={0.2} minZoom={0.05}>
            <Canvas />
          </ZoomProvider>
        </EditorPreviewProvider>
      </div>
    </div>
  );
}


