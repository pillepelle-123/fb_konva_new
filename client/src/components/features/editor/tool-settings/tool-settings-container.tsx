import { Card } from '../../../ui/composites/card';

interface ToolSettingsContainerProps {
  isExpanded: boolean;
  isVisible: boolean;
  children: React.ReactNode;
}

export function ToolSettingsContainer({ isExpanded, isVisible, children }: ToolSettingsContainerProps) {
  return (
    <Card 
      data-tool-settings-panel="true"
      className={`h-full rounded-none border-t-0 border-b-0 shadow-lg transition-all duration-200 flex flex-col overflow-hidden relative z-[1000] ${
        isExpanded ? 'w-[280px]' : 'w-12'
      } ${!isVisible ? 'hidden' : ''}`}
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