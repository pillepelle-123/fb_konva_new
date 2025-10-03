import { ProgressBar } from '../ui/feedback/progress-bar';

interface ExportProgressProps {
  progress: number;
}

export function ExportProgress({ progress }: ExportProgressProps) {
  return (
    <ProgressBar 
      progress={progress} 
      label={`Exporting... ${Math.round(progress)}%`} 
    />
  );
}