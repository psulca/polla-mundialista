import Link from "next/link";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { getHomeData } from "@/lib/data/home";
import { Countdown } from "@/components/brand/countdown";
import { MatchCard } from "@/components/brand/match-card";
import { Screen } from "@/components/brand/screen";
import { Flag } from "@/components/brand/flag";
import { RealtimeRefresh } from "@/components/brand/realtime-refresh";
import { InviteButton } from "@/components/brand/invite-button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FootballIcon,
  Coins01Icon,
  Time04Icon,
  ArrowRight01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { fmtKickoff } from "@/lib/format";
import { ENTRY_FEE } from "@/lib/data/entries";
import { cn } from "@/lib/utils";

export default async function Home() {
  const player = await getCurrentPlayer();
  const { openRound, deadlineAt, total, filled, top, live, next, playerCount, liveStale } =
    await getHomeData(player?.id ?? null);
  const approved = player?.status === "approved";
  const missing = approved && openRound ? Math.max(0, total - filled) : 0;

  // Jugador registrado pero todavía no aprobado: pantalla de espera dedicada.
  // No le mostramos el pozo ni el ranking hasta que el admin lo habilite.
  if (player && !approved) {
    return (
      <Screen>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-2 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-full bg-magenta/15">
            <HugeiconsIcon
              icon={Time04Icon}
              size={30}
              strokeWidth={2}
              className="text-magenta"
            />
          </span>
          <h1 className="font-display mt-4 text-3xl leading-tight text-foreground">
            Casi listo, {player.displayName}
          </h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Tu cuenta está{" "}
            <span className="font-bold text-foreground">
              pendiente de aprobación
            </span>
            . Paga tu inscripción e informa por WhatsApp; en cuanto el admin te
            habilite, entras a cargar tus pronósticos.
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <RealtimeRefresh />
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
          <HugeiconsIcon icon={FootballIcon} size={13} strokeWidth={2.5} />{" "}
          Mundial 2026
        </span>
        <h1 className="font-display mt-2 text-5xl leading-[0.85] text-foreground">
          Polla <span className="text-neon">Mundial</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {player ? (
            <>
              Hola,{" "}
              <span className="font-bold text-foreground">
                {player.displayName}
              </span>
            </>
          ) : (
            "Predice los marcadores. Gana puntos."
          )}
        </p>
      </header>

      {!player && (
        <Link
          href="/login"
          className="font-display mt-5 flex items-center justify-between rounded-2xl bg-neon px-5 py-4 text-2xl text-black"
        >
          Entrar
          <HugeiconsIcon icon={ArrowRight01Icon} size={26} strokeWidth={2.5} />
        </Link>
      )}

      {/* En vivo ahora — máxima prioridad, va arriba */}
      {live.length > 0 && (
        <section className="mt-6 animate-in fade-in slide-in-from-top-2 duration-500">
          <h2 className="font-display flex items-center gap-2 text-xl">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            En vivo ahora
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {live.map((m) => (
              <Link key={m.id} href={`/visor/${m.id}`} className="block">
                <MatchCard
                  accent="magenta"
                  status="live"
                  home={m.home}
                  away={m.away}
                  homeScore={m.homeScore}
                  awayScore={m.awayScore}
                  liveMinute={m.liveMinute}
                />
              </Link>
            ))}
          </div>
          {liveStale && (
            <p className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-muted-foreground opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-muted-foreground" />
              </span>
              Los marcadores en vivo pueden demorar unos segundos. Se actualizan solos.
            </p>
          )}
        </section>
      )}

      {/* HÉROE: la fecha activa es la acción principal */}
      <section className="ring-sticker mt-6 overflow-hidden rounded-3xl border border-neon/30 bg-linear-to-b from-neon/12 to-card">
        <div className="h-1.5 w-full bg-neon" />
        <div className="px-5 py-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha activa
              </span>
              <div className="mt-0.5 font-display text-4xl leading-none text-foreground">
                {openRound ? openRound.label : "Sin fecha abierta"}
              </div>
            </div>
            {openRound && deadlineAt && (
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                  Cierra en
                </span>
                <span className="font-display text-xl text-neon">
                  <Countdown target={deadlineAt} />
                </span>
              </div>
            )}
          </div>

          {approved && openRound ? (
            <>
              {/* progreso */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-neon transition-all"
                  style={{ width: `${total ? (filled / total) * 100 : 0}%` }}
                />
              </div>
              <Link
                href="/predicciones"
                className="font-display mt-3 flex items-center justify-between rounded-xl bg-neon px-4 py-3 text-lg text-black"
              >
                <span>
                  {missing > 0
                    ? `Te faltan ${missing} pronósticos`
                    : "Pronósticos completos"}
                </span>
                <span className="flex items-center gap-1">
                  {filled}/{total}
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={20}
                    strokeWidth={2.5}
                  />
                </span>
              </Link>
            </>
          ) : (
            !openRound && (
              <p className="mt-3 text-sm text-muted-foreground">
                El admin todavía no abrió ninguna fecha. ¡Pronto!
              </p>
            )
          )}
        </div>
      </section>

      {/* Datos compactos: pozo + próximo partido, lado a lado */}
      <div className={cn("mt-4 grid gap-3", next ? "grid-cols-2" : "grid-cols-1")}>
        <div className="flex flex-col justify-between rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={Coins01Icon}
              size={15}
              strokeWidth={2}
              className="text-gold"
            />
            Pozo {openRound ? `· ${openRound.label}` : ""}
          </span>
          <span className="font-display tnum mt-1 text-3xl leading-none text-gold">
            S/ {playerCount * ENTRY_FEE}
          </span>
          <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <HugeiconsIcon icon={UserGroupIcon} size={12} strokeWidth={2} />
            {playerCount} inscritos
          </span>
        </div>

        {next && (
          <Link
            href={`/visor/${next.id}`}
            className="flex flex-col justify-between rounded-2xl border border-azure/30 bg-azure/10 px-4 py-3.5"
          >
            <span className="text-xs text-muted-foreground">
              Próximo partido
            </span>
            <span className="font-display mt-1 text-xl leading-none text-azure">
              <Countdown target={next.kickoffAt} />
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <Flag code={next.home.flag} className="text-sm" />
              <span className="font-display">{next.home.code}</span>
              <span className="text-[11px] text-muted-foreground">vs</span>
              <span className="font-display">{next.away.code}</span>
              <Flag code={next.away.flag} className="text-sm" />
            </div>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {fmtKickoff(next.kickoffAt)}
            </span>
          </Link>
        )}
      </div>

      {/* Top 3 */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-xl">Top 3</h2>
          <Link
            href="/ranking"
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-neon"
          >
            Ver ranking
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={14}
              strokeWidth={2.5}
            />
          </Link>
        </div>
        <div className="ring-sticker overflow-hidden rounded-2xl border border-border bg-card">
          {top.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Todavía no hay puntos.
            </p>
          )}
          {top.map((r, i) => (
            <div
              key={r.playerId}
              className={cn(
                "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0",
                player?.id === r.playerId && "bg-neon/10",
              )}
            >
              <span
                className={cn(
                  "font-display tnum flex size-7 items-center justify-center rounded-lg text-base",
                  i === 0
                    ? "bg-gold text-black"
                    : "bg-white/8 text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate font-bold">{r.displayName}</span>
              <span className="font-display tnum text-2xl">
                {r.totalPoints}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <InviteButton />
      </div>
    </Screen>
  );
}
