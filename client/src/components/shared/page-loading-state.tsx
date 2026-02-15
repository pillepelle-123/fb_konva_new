interface PageLoadingStateProps {
  message?: string;
  /** When true (default), wraps content in container. Use false when parent already provides container. */
  withContainer?: boolean;
}

export default function PageLoadingState({ message = 'Loading...', withContainer = true }: PageLoadingStateProps) {
  const content = (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );

  if (withContainer) {
    return <div className="container mx-auto px-4 py-4">{content}</div>;
  }
  return content;
}
