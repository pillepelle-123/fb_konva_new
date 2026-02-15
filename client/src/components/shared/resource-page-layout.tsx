interface ResourcePageLayoutProps {
  title: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  headerAdditionalContent?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

export default function ResourcePageLayout({
  title,
  icon,
  actions,
  headerAdditionalContent,
  description,
  children,
}: ResourcePageLayoutProps) {
  return (
    <div className="w-full min-h-full">
      <div className="w-full">
        <div className="container mx-auto px-4">
          <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-sm border-b">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 text-foreground [&>svg]:h-6 [&>svg]:w-6">{icon}</span>
                <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{title}</h1>
              </div>
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
            {headerAdditionalContent}
          </div>

          <div className="space-y-6 py-4">
            {description && <p className="text-muted-foreground -mt-2">{description}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
