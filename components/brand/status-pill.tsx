import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/types";

export function StatusPill({
  status,
  kickoff,
  className,
}: {
  status: MatchStatus;
  kickoff?: string;
  className?: string;
}) {
  if (status === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-destructive",
          className,
        )}
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-destructive" />
        </span>
        En vivo
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
          className,
        )}
      >
        Final
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-azure/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-azure",
        className,
      )}
    >
      {kickoff ?? "Programado"}
    </span>
  );
}
