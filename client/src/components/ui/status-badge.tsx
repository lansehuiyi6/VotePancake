import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type StatusBadgeProps = {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  type StatusConfig = {
    [key: string]: {
      label: string;
      variant: 'outline' | 'default' | 'secondary' | 'destructive';
      className?: string;
    }
  }

  const statusConfig: StatusConfig = {
    pending: {
      label: 'Pending',
      variant: 'outline',
      className: 'border-amber-500 text-amber-500',
    },
    active: {
      label: 'Active',
      variant: 'default',
      className: 'bg-green-500 hover:bg-green-600',
    },
    completed: {
      label: 'Completed',
      variant: 'secondary',
    },
    rejected: {
      label: 'Rejected',
      variant: 'destructive',
    },
    // Add more statuses as needed
  }

  const config = statusConfig[status] || {
    label: status,
    variant: 'outline',
    className: ''
  }

  return (
    <Badge 
      variant={config.variant} 
      className={cn('whitespace-nowrap', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
