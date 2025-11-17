import { forwardRef } from 'react';

interface CanvasContainerProps {
  children: React.ReactNode;
  pageId?: string;
  activeTool?: string;
  stylePainterActive?: boolean;
  isMiniPreview?: boolean;
  editorInteractionLevel?: string;
}

const CanvasContainer = forwardRef<HTMLDivElement, CanvasContainerProps>(({
  children,
  pageId,
  activeTool,
  stylePainterActive,
  isMiniPreview,
  editorInteractionLevel
}, ref) => {
  const getCursor = () => {
    // For mini previews with answer_only, always use default cursor
    if (isMiniPreview && editorInteractionLevel === 'answer_only') {
      return 'default';
    }
    if (stylePainterActive) return 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTkuMDYgMTEuOUwxMi4wNiA4LjlMMTUuMDYgMTEuOUwxMi4wNiAxNC45TDkuMDYgMTEuOVoiIGZpbGw9IiMwMDAiLz4KPHA+YXRoIGQ9Ik0xMi4wNiA4LjlMMTUuMDYgNS45TDE4LjA2IDguOUwxNS4wNiAxMS45TDEyLjA2IDguOVoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+") 12 12, auto';
    if (!activeTool || activeTool === 'select' || activeTool === 'pan') return 'default';
    return 'crosshair';
  };
  return (
    <div 
      ref={ref}
      data-page-id={pageId}
      style={{
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        // borderRadius: '14px',
        // padding: '.5rem',
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: getCursor(),
      }}
    >
      {children}
    </div>
  );
});

CanvasContainer.displayName = 'CanvasContainer';

export { CanvasContainer };