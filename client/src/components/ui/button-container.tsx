interface ButtonContainerProps {
  children: React.ReactNode;
}

export function ButtonContainer({ children }: ButtonContainerProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '12px'
      }}
    >
      {children}
    </div>
  );
}