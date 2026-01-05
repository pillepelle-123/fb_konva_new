interface EditorBarContainerProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export function EditorBarContainer({ isVisible, children }: EditorBarContainerProps) {
  return (
    <div 
      className={`px-2 py-1 overflow-x-auto scrollbar-hide border-b shadow-lg sticky top-0 z-[1000] ${
        !isVisible ? 'hidden md:block' : ''
      }`}
      style={{ 
        isolation: 'isolate',
        position: 'sticky',
        zIndex: 1000
      }}
    >
      {children}
    </div>
  );
}