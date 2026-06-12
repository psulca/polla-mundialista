import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlayerProfile } from "@/lib/data/player";
import { Screen } from "@/components/brand/screen";
import { Flag } from "@/components/brand/flag";
import { StatusPill } from "@/components/brand/status-pill";
import { HugeiconsIcon } from "@hugeicons/react";
import { SquareLock02Icon } from "@hugeicons/core-free-icons";
import type { HitKind } from "@/lib/domain/scoring";
import { fmtKickoff } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_BADGE: Record<HitKind, { label: string; className: string }> = {
  exact: { label: "+3", className: "bg-gold text-black" },
  result: { label: "+1", className: "bg-neon text-black" },
  miss: { label: "0", className: "bg-white/10 text-muted-foreground" },
};

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  if (!profile) redirect("/");

  const header = (
    <>
      <h1 className="font-display text-4xl leading-none text-foreground">{profile.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pronósticos · solo de partidos que ya empezaron
      </p>
    </>
  );

  return (
    <Screen header={header}>
      {profile.rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-4 py-10 text-center">
          <HugeiconsIcon icon={SquareLock02Icon} size={28} strokeWidth={2} className="text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Todavía no hay pronósticos para mostrar. Se revelan cuando arranca cada partido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {profile.rows.map((r) => {
            const played = r.status !== "scheduled" && r.homeScore != null && r.awayScore != null;
            return (
              <Link
                key={r.matchId}
                href={`/visor/${r.matchId}`}
                className="ring-sticker block overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center justify-between px-4 pt-2.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {r.roundLabel}
                  </span>
                  <StatusPill status={r.status} kickoff={fmtKickoff(r.kickoffAt)} />
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Equipos + resultado real */}
                  <div className="flex flex-1 items-center gap-2">
                    <Flag code={r.home.flag} className="text-2xl" />
                    <span className="font-display text-lg">{r.home.code}</span>
                  </div>
                  <div className="font-display tnum text-2xl leading-none">
                    {played ? (
                      <>
                        {r.homeScore} <span className="text-muted-foreground/40">:</span> {r.awayScore}
                      </>
                    ) : (
                      <span className="text-base text-muted-foreground">VS</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-row-reverse items-center gap-2">
                    <Flag code={r.away.flag} className="text-2xl" />
                    <span className="font-display text-lg">{r.away.code}</span>
                  </div>
                </div>
                {/* Su pronóstico */}
                <div className="flex items-center justify-between border-t border-border bg-black/20 px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    Su pronóstico:{" "}
                    <span className="tnum font-bold text-foreground">
                      {r.pred.home}–{r.pred.away}
                    </span>
                  </span>
                  {r.hitKind && (
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide",
                        KIND_BADGE[r.hitKind].className,
                      )}
                    >
                      {KIND_BADGE[r.hitKind].label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
