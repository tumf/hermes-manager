import { Badge } from '@/src/components/ui/badge';
import { cn } from '@/src/lib/utils';

type Status = 'running' | 'stopped' | 'unknown';

const statusConfig: Record<Status, { label: string; dotClass: string; variant: 'outline' }> = {
  running: { label: 'Running', dotClass: 'bg-green-500', variant: 'outline' },
  stopped: { label: 'Stopped', dotClass: 'bg-muted-foreground/40', variant: 'outline' },
  unknown: { label: 'Unknown', dotClass: 'bg-yellow-500', variant: 'outline' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, dotClass, variant } = statusConfig[status];
  return (
    <Badge variant={variant} className={cn('gap-1.5', className)} role="status">
      <span className={cn('h-2 w-2 rounded-full', dotClass)} aria-hidden="true" />
      {label}
    </Badge>
  );
}
