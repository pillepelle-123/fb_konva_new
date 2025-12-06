import { Card } from '../../../ui/composites/card';

interface ToolbarContainerProps {
  isExpanded: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

export function ToolbarContainer({ isExpanded, isVisible, children }: ToolbarContainerProps) {
  return (
    <Card 
      className={`h-full rounded-none border-t-0 border-b-0 shadow-lg transition-all duration-200 flex flex-col overflow-visible relative z-[1000] ${
        isExpanded ? 'w-24' : 'w-14 p-0'
      } ${!isVisible ? 'hidden md:block' : ''}`}
      style={{ 
        isolation: 'isolate',
        position: 'relative',
        zIndex: 1000
      }}
    >
      {children}
    </Card>
  );
}