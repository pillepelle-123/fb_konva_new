interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

export default function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000'
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}