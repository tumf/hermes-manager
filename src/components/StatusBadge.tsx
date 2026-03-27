import { Badge } from '@/src/components/ui/badge';

type Status = 'running' | 'stopped' | 'unknown';

const statusConfig: Record<
  Status,
  { label: string; variant: 'success' | 'destructive' | 'secondary' }
> = {
  running: { label: 'Running', variant: 'success' },
  stopped: { label: 'Stopped', variant: 'destructive' },
  unknown: { label: 'Unknown', variant: 'secondary' },
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, variant } = statusConfig[status];
  return <Badge variant={variant}>{label}</Badge>;
}
