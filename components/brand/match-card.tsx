import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/types";
import type { HitKind } from "@/lib/domain/scoring";
import { StatusPill } from "./status-pill";
import { Flag } from "./flag";

export type Accent = "neon" | "magenta" | "azure" | "tangerine" | "gold" | "grape";

const ACCENT_BAR: Record<Accent, string> = {
  neon: "bg-neon",
  magenta: "bg-magenta",
  azure: "bg-azure",
  tangerine: "bg-tangerine",
  gold: "bg-gold",
  grape: "bg-grape",
};

const HIT_BADGE: Record<HitKind, { label: string; className: string }> = {
  exact: { label: "+3 EXACTO", className: "bg-gold text-black" },
  result: { label: "+1 RESULTADO", className: "bg-neon text-black" },
  miss: { label: "+0", className: "bg-white/10 text-muted-foreground" },
};

type SideState = "win" | "lose" | "neutral";

interface TeamLite {
  code: string;
  flag: string;
  name?: string;
}

export interface MatchCardProps {
  home: TeamLite;
  away: TeamLite;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  kickoff?: string;
  roundLabel?: string;
  accent?: Accent;
  /** Predicción del usuario para este partido. */
  prediction?: { home: number; away: number; kind?: HitKind };
  className?: string;
}

function TeamSide({
  team,
  align,
  state,
}: {
  team: TeamLite;
  align: "left" | "right";
  state: SideState;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5",
        align === "right" && "flex-row-reverse",
      )}
    >
      <Flag
        code={team.flag}
        className={cn("text-3xl transition-opacity", state === "lose" && "opacity-40")}
      />
      <span
        className={cn(
          "font-display truncate text-2xl leading-none",
          state === "lose" ? "text-muted-foreground opacity-60" : "text-foreground",
        )}
      >
        {team.code}
      </span>
    </div>
  );
}

export function MatchCard({
  home,
  away,
  status,
  homeScore,
  awayScore,
  kickoff,
  roundLabel,
  accent = "neon",
  prediction,
  className,
}: MatchCardProps) {
  const played = status !== "scheduled" && homeScore != null && awayScore != null;
  const finished = status === "finished" && homeScore != null && awayScore != null;

  let homeState: SideState = "neutral";
  let awayState: SideState = "neutral";
  if (finished && homeScore! !== awayScore!) {
    const homeWon = homeScore! > awayScore!;
    homeState = homeWon ? "win" : "lose";
    awayState = homeWon ? "lose" : "win";
  }

  function scoreClass(side: SideState): string {
    if (!played) return "text-muted-foreground";
    if (side === "win") return "text-neon";
    if (side === "lose") return "text-muted-foreground opacity-60";
    return "text-foreground";
  }

  return (
    <div
      className={cn(
        "ring-sticker relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div className={cn("h-1.5 w-full", ACCENT_BAR[accent], finished && "opacity-50")} />

      <div className="flex items-center justify-between px-4 pt-3">
        <StatusPill status={status} kickoff={kickoff} />
        {roundLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {roundLabel}
          </span>
        )}
      </div>

      {/* marcador */}
      <div className="flex items-center gap-3 px-4 py-4">
        <TeamSide team={home} align="left" state={homeState} />
        <div className="font-display tnum flex shrink-0 items-center gap-2 text-4xl leading-none">
          <span className={scoreClass(homeState)}>{played ? homeScore : "–"}</span>
          <span className="text-muted-foreground/50">:</span>
          <span className={scoreClass(awayState)}>{played ? awayScore : "–"}</span>
        </div>
        <TeamSide team={away} align="right" state={awayState} />
      </div>

      {/* tu predicción */}
      {prediction && (
        <div className="flex items-center justify-between border-t border-border bg-black/20 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tu pronóstico&nbsp;
            <span className="tnum font-bold text-foreground">
              {prediction.home}–{prediction.away}
            </span>
          </span>
          {prediction.kind && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide",
                HIT_BADGE[prediction.kind].className,
              )}
            >
              {HIT_BADGE[prediction.kind].label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
