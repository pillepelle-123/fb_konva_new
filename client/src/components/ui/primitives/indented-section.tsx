import { ReactNode } from 'react';

interface IndentedSectionProps {
  children: ReactNode;
}

export function IndentedSection({ children }: IndentedSectionProps) {
  return (
    <div className="space-y-2 ml-4 border-l-2 border-muted pl-2">
      {children}
    </div>
  );
}