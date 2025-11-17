import { useEffect } from 'react';
import { EditorPreviewProvider } from './editor-preview-provider';
import Canvas from '../canvas/canvas';
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

  const isModal = props.className?.includes('h-full');
  const containerHeight = isModal ? '100%' : 360;

  return (
    <div className={`rounded-2xl bg-white shadow-sm border p-4 ${props.className ?? ''}`}>
      {!isModal && <div className="text-sm font-semibold mb-3">Live Preview</div>}
      <div
        className="w-full mini-editor-preview"
        style={{
          width: '100%',
          // Keep a stable aspect that fits both A4/A5 portrait spreads; Canvas auto-fits
          height: containerHeight,
          overflow: 'hidden',
          borderRadius: 12,
          // Fully disable interactions (mouse, wheel, keyboard) in the mini preview
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
        >
          <Canvas />
        </EditorPreviewProvider>
      </div>
    </div>
  );
}


