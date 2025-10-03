interface QuillEditorContainerProps {
  children?: React.ReactNode;
}

export default function QuillEditorContainer({ children }: QuillEditorContainerProps) {
  return (
    <div
      style={{
        minHeight: '200px',
        marginBottom: '12px'
      }}
    >
      {children}
    </div>
  );
}