import { Badge } from "./ui/badge";
import { Lock, CheckCircle2, Vote, ThumbsUp, ThumbsDown, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pending Review",
          icon: Lock,
          variant: "secondary" as const,
        };
      case "approved":
        return {
          label: "Public",
          icon: CheckCircle2,
          variant: "outline" as const,
        };
      case "active":
        return {
          label: "Voting",
          icon: Vote,
          variant: "default" as const,
        };
      case "passed":
        return {
          label: "Passed",
          icon: ThumbsUp,
          variant: "outline" as const,
        };
      case "rejected":
        return {
          label: "Failed",
          icon: ThumbsDown,
          variant: "destructive" as const,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          icon: Clock,
          variant: "outline" as const,
        };
      default:
        return {
          label: status,
          icon: Clock,
          variant: "outline" as const,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
