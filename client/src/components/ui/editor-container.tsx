interface EditorContainerProps {
  children: React.ReactNode;
}

export function EditorContainer({ children }: EditorContainerProps) {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '80vw',
        maxWidth: '900px',
        minWidth: '400px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}
    >
      {children}
    </div>
  );
}