import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TripStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';

interface StatusBadgeProps {
  status: TripStatus | MaintenanceStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  assigned: { label: 'Assigned', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  in_progress: { label: 'In Progress', className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  completed: { label: 'Completed', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  open: { label: 'Open', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: '' };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}