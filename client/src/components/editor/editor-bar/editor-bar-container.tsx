interface EditorBarContainerProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export function EditorBarContainer({ isVisible, children }: EditorBarContainerProps) {
  return (
    <div className={`px-2 overflow-x-auto scrollbar-hide border-b shadow-lg ${
      !isVisible ? 'hidden md:block' : ''
    }`}>
      {children}
    </div>
  );
}