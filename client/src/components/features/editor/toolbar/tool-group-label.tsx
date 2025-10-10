interface ToolGroupLabelProps {
  children: React.ReactNode;
}

export function ToolGroupLabel({ children }: ToolGroupLabelProps) {
  return (
    <div className="px-2 py-1 text-md font-medium">
      {children}
    </div>
  );
}