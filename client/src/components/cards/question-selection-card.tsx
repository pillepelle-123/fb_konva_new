interface QuestionSelectionCardProps {
  onSelect: () => void;
}

export default function QuestionSelectionCard({ onSelect }: QuestionSelectionCardProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        height: 'auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '12px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        backgroundColor: 'white',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#0f172a',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
      }}
    >
      <span
        style={{
          fontSize: '20px',
          fontWeight: 'bold'
        }}
      >
        +
      </span>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: '500' }}>Select question</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          Select from existing questions or add new
        </div>
      </div>
    </button>
  );
}