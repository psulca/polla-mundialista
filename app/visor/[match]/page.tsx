import Link from "next/link";
import { redirect } from "next/navigation";
import { getMatchDetail } from "@/lib/data/match-detail";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusPill } from "@/components/brand/status-pill";
import { Flag } from "@/components/brand/flag";
import { RealtimeRefresh } from "@/components/brand/realtime-refresh";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SquareLock02Icon,
  CheckmarkBadge01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import type { HitKind } from "@/lib/domain/scoring";
import { fmtKickoff } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_BADGE: Record<HitKind, { label: string; className: string }> = {
  exact: { label: "+3", className: "bg-gold text-black" },
  result: { label: "+1", className: "bg-neon text-black" },
  miss: { label: "0", className: "bg-white/10 text-muted-foreground" },
};

function Me() {
  return <span className="ml-2 text-[10px] font-extrabold uppercase text-neon">Tú</span>;
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ match: string }>;
}) {
  const { match } = await params;
  const id = Number(match);
  if (!Number.isFinite(id)) redirect("/");

  const player = await getCurrentPlayer();
  const d = await getMatchDetail(id, player?.id ?? null);
  if (!d) redirect("/");

  const played = d.status !== "scheduled" && d.homeScore != null && d.awayScore != null;

  return (
    <div className="flex h-full flex-col">
      <RealtimeRefresh />

      {/* Cabecera fija: el partido */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {d.groupLetter ? `Grupo ${d.groupLetter}` : d.roundLabel}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="flex w-20 flex-col items-center gap-1">
            <Flag code={d.home.flag} className="text-4xl" />
            <span className="font-display text-base">{d.home.code}</span>
          </div>
          <div className="font-display tnum text-4xl leading-none">
            {played ? (
              <>
                {d.homeScore} <span className="text-muted-foreground/40">:</span> {d.awayScore}
              </>
            ) : (
              <span className="text-2xl text-muted-foreground">VS</span>
            )}
          </div>
          <div className="flex w-20 flex-col items-center gap-1">
            <Flag code={d.away.flag} className="text-4xl" />
            <span className="font-display text-base">{d.away.code}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <StatusPill status={d.status} kickoff={fmtKickoff(d.kickoffAt)} />
        </div>
      </div>

      {!d.revealed ? (
        // ── Antes del kickoff ──────────────────────────────────────────────
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 px-4 pb-4">
          <div className="flex shrink-0 flex-col items-center rounded-2xl border border-azure/30 bg-azure/10 px-4 py-4 text-center">
            <HugeiconsIcon icon={SquareLock02Icon} size={26} strokeWidth={2} className="text-azure" />
            <p className="mt-1.5 text-sm text-foreground">
              Las predicciones de todos se revelan cuando empiece el partido.
            </p>
          </div>

          {d.myPrediction ? (
            <div className="shrink-0 rounded-xl border border-neon/30 bg-neon/10 px-4 py-2.5 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tu pronóstico
              </span>
              <div className="font-display tnum text-2xl text-neon">
                {d.myPrediction.home} : {d.myPrediction.away}
              </div>
            </div>
          ) : (
            <Link
              href="/predicciones"
              className="font-display shrink-0 rounded-xl bg-neon px-4 py-3 text-center text-lg text-black"
            >
              Cargar mi pronóstico
            </Link>
          )}

          <div className="flex shrink-0 items-center justify-between rounded-xl bg-white/5 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Ya predijeron</span>
            <span className="font-display text-xl">
              <span className="text-neon">{d.votedCount}</span> / {d.approvedCount}
            </span>
          </div>

          <ScrollArea className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
            {d.rows.map((r) => (
              <Link
                key={r.playerId}
                href={`/jugador/${r.playerId}`}
                className={cn(
                  "flex items-center gap-2.5 border-b border-border px-4 py-2.5 transition last:border-b-0 hover:bg-white/5 active:bg-white/10",
                  r.isMe && "bg-neon/10",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {r.isMe && <Me />}
                </span>
                {r.voted ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-neon">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} size={14} strokeWidth={2.5} />
                    Listo
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin cargar</span>
                )}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={2.5}
                  className="shrink-0 text-muted-foreground/40"
                />
              </Link>
            ))}
          </ScrollArea>
        </div>
      ) : (
        // ── En vivo / Terminado (revelado) ─────────────────────────────────
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 px-4 pb-4">
          <h2 className="font-display shrink-0 text-xl">
            {d.finished ? "Resultados" : "Predicciones de todos"}
          </h2>
          <ScrollArea className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
            {d.rows.map((r) => (
              <Link
                key={r.playerId}
                href={`/jugador/${r.playerId}`}
                className={cn(
                  "flex items-center gap-3 border-b border-border px-4 py-3 transition last:border-b-0 hover:bg-white/5 active:bg-white/10",
                  r.isMe && "bg-neon/10",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {r.isMe && <Me />}
                </span>
                {r.pred ? (
                  <span className="font-display tnum text-lg">
                    {r.pred.home}-{r.pred.away}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No cargó</span>
                )}
                {d.finished && r.kind && (
                  <span
                    className={cn(
                      "w-8 shrink-0 rounded-md py-0.5 text-center text-[11px] font-extrabold",
                      KIND_BADGE[r.kind].className,
                    )}
                  >
                    {KIND_BADGE[r.kind].label}
                  </span>
                )}
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={16}
                  strokeWidth={2.5}
                  className="shrink-0 text-muted-foreground/40"
                />
              </Link>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
