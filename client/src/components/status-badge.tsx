import { Badge } from "./ui/badge";
import { Lock, CheckCircle2, Vote, ThumbsUp, ThumbsDown, Clock, AlertCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "待审核",
          icon: Lock,
          variant: "secondary" as const,
        };
      case "publicized":
        return {
          label: "已公示",
          icon: AlertCircle,
          variant: "default" as const,
        };
      case "approved":
        return {
          label: "已通过",
          icon: CheckCircle2,
          variant: "outline" as const,
        };
      case "active":
        return {
          label: "投票中",
          icon: Vote,
          variant: "default" as const,
        };
      case "passed":
        return {
          label: "已通过",
          icon: ThumbsUp,
          variant: "outline" as const,
        };
      case "rejected":
        return {
          label: "已拒绝",
          icon: ThumbsDown,
          variant: "destructive" as const,
        };
      case "closed":
        return {
          label: "已关闭",
          icon: Clock,
          variant: "outline" as const,
        };
      case "cancelled":
        return {
          label: "已取消",
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
    <Badge variant={config.variant} className={className} data-testid={`badge-status-${status}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
