import { Badge } from "@/shared/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/shared/utils";

type Status = "active" | "inactive" | "pending" | "error" | string;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

/**
 * Badge component for displaying status with icons
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: Status) => {
    const normalized = status.toLowerCase();
    
    switch (normalized) {
      case "active":
      case "success":
      case "completed":
        return {
          icon: CheckCircle,
          variant: "default" as const,
          label: "Active",
          className: "bg-green-500 hover:bg-green-600",
        };
      case "inactive":
      case "disabled":
        return {
          icon: XCircle,
          variant: "secondary" as const,
          label: "Inactive",
          className: "bg-gray-500 hover:bg-gray-600",
        };
      case "pending":
      case "processing":
        return {
          icon: Clock,
          variant: "outline" as const,
          label: "Pending",
          className: "border-yellow-500 text-yellow-600",
        };
      case "error":
      case "failed":
        return {
          icon: AlertCircle,
          variant: "destructive" as const,
          label: "Error",
          className: "bg-red-500 hover:bg-red-600",
        };
      default:
        return {
          icon: Clock,
          variant: "outline" as const,
          label: status,
          className: "",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1", config.className, className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
