interface PageContainerProps {
  children: React.ReactNode;
}

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {children}
    </div>
  );
}