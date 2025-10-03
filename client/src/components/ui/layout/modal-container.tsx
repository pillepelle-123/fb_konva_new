interface ModalContainerProps {
  children: React.ReactNode;
}

export function ModalContainer({ children }: ModalContainerProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '24px',
      minWidth: '400px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
    }}>
      {children}
    </div>
  );
}