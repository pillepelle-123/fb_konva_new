interface ModalButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function ModalButton({ onClick, disabled = false, variant = 'secondary', children }: ModalButtonProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        border: isPrimary ? 'none' : '1px solid #d1d5db',
        borderRadius: '4px',
        backgroundColor: isPrimary ? '#2563eb' : 'white',
        color: isPrimary ? 'white' : 'black',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {children}
    </button>
  );
}