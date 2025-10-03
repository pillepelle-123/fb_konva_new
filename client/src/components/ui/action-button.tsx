interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  style?: React.CSSProperties;
}

export function ActionButton({ children, onClick, variant = 'secondary', style }: ActionButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none'
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          color: 'white',
          border: 'none'
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none'
        };
      default:
        return {
          backgroundColor: 'transparent',
          color: 'inherit',
          border: '1px solid #ccc'
        };
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        ...getVariantStyles(),
        ...style
      }}
    >
      {children}
    </button>
  );
}