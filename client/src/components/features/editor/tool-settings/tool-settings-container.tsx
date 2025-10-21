import { Card } from '../../../ui/composites/card';

interface ToolSettingsContainerProps {
  isExpanded: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

export function ToolSettingsContainer({ isExpanded, isVisible, children }: ToolSettingsContainerProps) {
  return (
    <Card className={`h-full rounded-none border-l-0 border-t-0 border-b-0 shadow-lg transition-all duration-200 flex flex-col overflow-hidden ${
      isExpanded ? 'w-[280px]' : 'w-12'
    } ${!isVisible ? 'hidden' : ''}`}>
      {children}
    </Card>
  );
}