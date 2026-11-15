import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

const toneMap: Record<string, Tone> = {
  active: "success",
  completed: "success",
  generated: "success",
  paid: "success",
  verified: "success",
  draft: "secondary",
  pending: "warning",
  manual: "info",
  elektronik: "info",
  expired: "destructive",
  rejected: "destructive",
  cancelled: "destructive",
  archived: "secondary",
  inactive: "secondary",
  monthly: "info",
  yearly: "info",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = toneMap[status.toLowerCase()] ?? "secondary";

  const classes: Record<Tone, string> = {
    default: "",
    secondary: "",
    destructive: "",
    outline: "",
    success: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "border-transparent bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  return (
    <Badge variant="secondary" className={cn("capitalize", classes[tone], className)}>
      {status}
    </Badge>
  );
}
