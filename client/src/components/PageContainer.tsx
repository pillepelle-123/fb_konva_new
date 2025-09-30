interface PageContainerProps {
  children: React.ReactNode;
}

export default function PageContainer({ children }: PageContainerProps) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}