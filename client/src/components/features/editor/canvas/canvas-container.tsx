import { forwardRef } from 'react';

interface CanvasContainerProps {
  children: React.ReactNode;
  pageId?: string;
  activeTool?: string;
}

const CanvasContainer = forwardRef<HTMLDivElement, CanvasContainerProps>(({
  children,
  pageId,
  activeTool
}, ref) => {
  const getCursor = () => {
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
        cursor: getCursor(),
      }}
    >
      {children}
    </div>
  );
});

CanvasContainer.displayName = 'CanvasContainer';

export { CanvasContainer };