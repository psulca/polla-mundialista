import { Suspense } from "react";
import Link from "next/link";
import { getLeaderboard, getRoundLeaderboard, type LeaderRow } from "@/lib/data/ranking";
import { getRounds, type RoundRow } from "@/lib/data/visor";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HScroll } from "@/components/brand/h-scroll";
import { JumpToMe } from "@/components/ranking/jump-to-me";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Target02Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

function rankBadge(pos: number): string {
  if (pos === 1) return "bg-gold text-black";
  if (pos === 2) return "bg-white/25 text-black";
  if (pos === 3) return "bg-tangerine/80 text-black";
  return "bg-white/8 text-muted-foreground";
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const { fecha } = await searchParams;
  const rounds = await getRounds();
  const fechaRound = fecha ? rounds.find((r) => r.key === fecha) : undefined;
  const me = await getCurrentPlayer();

  return (
    <div className="flex h-full flex-col">
      {/* Header fijo: sale al instante */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl text-foreground">Ranking</h1>
          {me && <JumpToMe playerId={me.id} />}
        </div>

        {/* Alcance: general o una fecha */}
        <HScroll className="-mx-4 mt-3">
          <div className="flex gap-2 px-4">
            <Link
              href="/ranking"
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                !fechaRound ? "bg-neon text-black" : "bg-white/8 text-muted-foreground",
              )}
            >
              General
            </Link>
            {rounds.map((r) => (
              <Link
                key={r.id}
                href={`/ranking?fecha=${r.key}`}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  fechaRound?.id === r.id ? "bg-neon text-black" : "bg-white/8 text-muted-foreground",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </HScroll>
      </div>

      {/* Tabla + pozo: cargan en su propio contenedor (skeleton al cambiar de fecha) */}
      <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-4 pb-4">
        <Suspense key={fecha ?? "general"} fallback={<RankSkeleton hasPot={!!fechaRound} />}>
          <RankBody fechaRound={fechaRound} meId={me?.id ?? null} />
        </Suspense>
      </div>
    </div>
  );
}

async function RankBody({
  fechaRound,
  meId,
}: {
  fechaRound: RoundRow | undefined;
  meId: string | null;
}) {
  const rows: LeaderRow[] = fechaRound
    ? await getRoundLeaderboard(fechaRound.id, "general")
    : await getLeaderboard("general");

  // En una fecha, las filas YA son solo los inscritos → la cantidad es el pozo.
  const pot = fechaRound ? rows.length * fechaRound.entry_fee : null;

  return (
    <>
      {pot != null ? (
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HugeiconsIcon icon={Coins01Icon} size={14} strokeWidth={2} className="text-gold" />
            Pozo {fechaRound?.label} · {rows.length} inscritos
          </span>
          <span className="font-display tnum text-lg text-gold">S/ {pot}</span>
        </div>
      ) : (
        <p className="mb-3 shrink-0 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
          Acumulado de todas tus fechas · toca un jugador para ver sus pronósticos
        </p>
      )}

      <ScrollArea className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {fechaRound
              ? "Nadie pagó esta fecha todavía."
              : "Todavía no hay puntos. ¡Que ruede la pelota!"}
          </p>
        )}
        {rows.map((r, i) => {
          const pos = i + 1;
          const mine = meId === r.playerId;
          return (
            <Link
              key={r.playerId}
              href={`/jugador/${r.playerId}`}
              id={`rank-${r.playerId}`}
              className={cn(
                "flex scroll-mt-2 items-center gap-3 border-b border-border py-3 pl-3 pr-3 transition-colors last:border-b-0 hover:bg-white/5",
                mine && "bg-neon/10",
              )}
            >
              <span
                className={cn(
                  "font-display tnum flex size-8 shrink-0 items-center justify-center rounded-lg text-lg",
                  rankBadge(pos),
                )}
              >
                {pos}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-foreground">
                  {r.displayName}
                  {mine && (
                    <span className="ml-2 text-[10px] font-extrabold uppercase text-neon">Tú</span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Target02Icon} size={12} strokeWidth={2} className="text-gold" />
                    <span className="tnum font-bold text-gold">{r.exactCount}</span> exactos
                  </span>
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} size={12} strokeWidth={2} className="text-neon" />
                    <span className="tnum font-bold text-neon">{r.resultCount}</span> resultados
                  </span>
                </div>
              </div>
              <span className="font-display tnum shrink-0 text-right text-3xl leading-none text-foreground">
                {r.totalPoints}
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/50"
              />
            </Link>
          );
        })}
      </ScrollArea>
    </>
  );
}

function RankSkeleton({ hasPot }: { hasPot: boolean }) {
  return (
    <>
      <div
        className={cn(
          "mb-3 h-8 shrink-0 animate-pulse rounded-xl",
          hasPot ? "bg-gold/10" : "bg-white/5",
        )}
      />
      <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="mb-2.5 h-11 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </>
  );
}
