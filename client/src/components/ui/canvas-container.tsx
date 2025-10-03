import { forwardRef } from 'react';

interface CanvasContainerProps {
  children: React.ReactNode;
  pageId?: string;
}

const CanvasContainer = forwardRef<HTMLDivElement, CanvasContainerProps>(({
  children,
  pageId
}, ref) => {
  return (
    <div 
      ref={ref}
      data-page-id={pageId}
      style={{
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: '14px',
        padding: '.5rem',
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F9FAFB',
      }}
    >
      {children}
    </div>
  );
});

CanvasContainer.displayName = 'CanvasContainer';

export default CanvasContainer;