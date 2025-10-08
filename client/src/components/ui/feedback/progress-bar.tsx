interface ProgressBarProps {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <div style={{ marginBottom: '4px', fontSize: '14px' }}>
          {label}
        </div>
      )}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          backgroundColor: 'hsl(var(--primary))',
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}