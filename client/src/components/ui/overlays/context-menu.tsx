interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

export default function ContextMenu({ x, y, visible, onDuplicate, onDelete }: ContextMenuProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        minWidth: '120px'
      }}
    >
      <button
        onClick={onDuplicate}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          backgroundColor: 'transparent',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '14px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Duplicate
      </button>
      <button
        onClick={onDelete}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: 'none',
          backgroundColor: 'transparent',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#dc2626'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#fef2f2';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Delete
      </button>
    </div>
  );
}