import { Card } from '../../../ui/composites/card';

interface ToolbarContainerProps {
  isExpanded: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

export function ToolbarContainer({ isExpanded, isVisible, children }: ToolbarContainerProps) {
  return (
    <Card className={`h-full rounded-none border-r-0 border-t-0 border-b-0 shadow-lg transition-all duration-200 flex flex-col overflow-y-auto scrollbar-hide ${
      isExpanded ? 'w-48' : 'w-16 p-0'
    } ${!isVisible ? 'hidden md:block' : ''}`}>
      {children}
    </Card>
  );
}