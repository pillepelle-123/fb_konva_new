import { Square } from 'lucide-react';

interface QuestionPositionIconProps {
  className?: string;
}

export function QuestionPositionTop({ className }: QuestionPositionIconProps) {
  return (
    <div className={`relative ${className}`}>
      <Square className="absolute top-0 left-1/3 transform -translate-x-1/2" size={6} strokeWidth={2} />
      <Square className="absolute bottom-0 left-1/2 transform -translate-x-1/2" size={12} />
    </div>
  );
}

export function QuestionPositionBottom({ className }: QuestionPositionIconProps) {
  return (
    <div className={`relative ${className}`}>
      <Square className="absolute top-0 left-1/2 transform -translate-x-1/2" size={12} strokeWidth={1}/>
      <Square className="absolute bottom-0 left-1/3 transform -translate-x-1/2" size={6} strokeWidth={2} />
    </div>
  );
}

export function QuestionPositionLeft({ className }: QuestionPositionIconProps) {
  return (
    <div className={`relative ${className}`}>
      <Square className="absolute top-1/3 left-0 transform -translate-y-1/2" size={6} strokeWidth={2} />
      <Square className="absolute top-1/2 right-0 transform -translate-y-1/2" size={12} />
    </div>
  );
}

export function QuestionPositionRight({ className }: QuestionPositionIconProps) {
  return (
    <div className={`relative ${className}`}>
      <Square className="absolute top-1/2 left-0 transform -translate-y-1/2" size={12} />
      <Square className="absolute top-1/3 right-0 transform -translate-y-1/2" size={6} strokeWidth={2} />
    </div>
  );
}