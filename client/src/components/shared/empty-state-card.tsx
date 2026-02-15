import { Card, CardContent } from '../ui/composites/card';
import { Button } from '../ui/primitives/button';

interface EmptyStateAction {
  label: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'highlight';
}

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export default function EmptyStateCard({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="text-center py-12">
        <div className="flex justify-center mb-4 [&>svg]:h-12 [&>svg]:w-12 [&>svg]:text-muted-foreground [&>svg]:opacity-50">
          {icon}
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        {(primaryAction || secondaryAction) && (
          <div className="flex justify-center gap-2 flex-wrap">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                variant={primaryAction.variant ?? 'default'}
                className="space-x-2"
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant={secondaryAction.variant ?? 'outline'}
                onClick={secondaryAction.onClick}
                className="space-x-2"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
