import { Suspense } from "react";
import Link from "next/link";
import {
  getRounds,
  getCurrentRound,
  getMatchesForRound,
  getPlayerPredictions,
  type VisorMatch,
} from "@/lib/data/visor";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { MatchCard, type Accent } from "@/components/brand/match-card";
import { SectionBanner } from "@/components/brand/section-banner";
import { HScroll } from "@/components/brand/h-scroll";
import { GroupJump } from "@/components/visor/group-jump";
import { TeamSearch } from "@/components/visor/team-search";
import { Screen } from "@/components/brand/screen";
import { RealtimeRefresh } from "@/components/brand/realtime-refresh";
import { classify, type HitKind } from "@/lib/domain/scoring";
import { fmtKickoff } from "@/lib/format";
import { COUNTRY_ES } from "@/lib/country-names-es";
import { cn } from "@/lib/utils";

const ACCENTS: Accent[] = [
  "neon",
  "magenta",
  "azure",
  "tangerine",
  "gold",
  "grape",
];

function accentForGroup(letter: string | null, i: number): Accent {
  if (letter) return ACCENTS[(letter.charCodeAt(0) - 65) % ACCENTS.length];
  return ACCENTS[i % ACCENTS.length];
}

export default async function VisorPage({
  searchParams,
}: {
  searchParams: Promise<{ ronda?: string }>;
}) {
  // Solo las fechas (rápido) → las pastillas y el header salen al instante.
  const rounds = await getRounds();
  const { ronda } = await searchParams;
  // Sin ?ronda → la fecha "frontera" (la actual del torneo); si hay param, esa.
  const current =
    (ronda ? rounds.find((r) => r.key === ronda) : undefined) ??
    (await getCurrentRound()) ??
    rounds[0];
  const player = await getCurrentPlayer();

  const header = (
    <>
      <h1 className="font-display text-4xl text-foreground">Visor</h1>
      <HScroll className="-mx-4 mt-4">
        <div className="flex gap-2 px-4">
          {rounds.map((r) => (
            <Link
              key={r.id}
              href={`/visor?ronda=${r.key}`}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                r.id === current?.id
                  ? "bg-neon text-black"
                  : "bg-white/8 text-muted-foreground hover:bg-white/12",
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </HScroll>
    </>
  );

  return (
    <Screen header={header}>
      <RealtimeRefresh />
      {/* Los partidos cargan en su propio contenedor: al cambiar de fecha se ve un
          esqueleto acá, no se congela toda la página (key fuerza el fallback). */}
      <Suspense key={current?.id ?? "none"} fallback={<MatchesSkeleton />}>
        <RoundContent
          roundId={current?.id ?? null}
          roundLabel={current?.label}
          playerId={player?.id ?? null}
        />
      </Suspense>
    </Screen>
  );
}

async function RoundContent({
  roundId,
  roundLabel,
  playerId,
}: {
  roundId: number | null;
  roundLabel?: string;
  playerId: string | null;
}) {
  const [matches, myPreds] = await Promise.all([
    roundId ? getMatchesForRound(roundId) : Promise.resolve<VisorMatch[]>([]),
    playerId ? getPlayerPredictions(playerId) : Promise.resolve(new Map()),
  ]);

  if (matches.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        Todavía no hay partidos en esta ronda.
      </p>
    );
  }

  const isGroupStage = matches.some((m) => m.groupLetter);
  const groups = new Map<string, VisorMatch[]>();
  for (const m of matches) {
    const key = m.groupLetter ?? "—";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
  }
  const groupLetters = [...groups.keys()].filter((k) => k !== "—").sort();

  const searchTeam = (t: VisorMatch["home"], matchId: number) => {
    const es = (t.flag && COUNTRY_ES[t.flag]) || "";
    return {
      label: `${es.split("|")[0] || t.name} (${t.code})`,
      matchId,
      keywords: `${t.name} ${t.code} ${es.replace(/\|/g, " ")}`,
    };
  };
  const searchTeams = matches.flatMap((m) => [
    searchTeam(m.home, m.id),
    searchTeam(m.away, m.id),
  ]);

  function predFor(m: VisorMatch) {
    const p = myPreds.get(m.id);
    if (!p) return undefined;
    const finished =
      m.status === "finished" && m.homeScore != null && m.awayScore != null;
    const kind: HitKind | undefined = finished
      ? classify(
          { home: p.home, away: p.away },
          { home: m.homeScore!, away: m.awayScore! },
        )
      : undefined;
    return { home: p.home, away: p.away, kind };
  }

  return (
    <>
      {/* Buscador + salto por grupo: fijos arriba mientras se scrollea la lista. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/40 bg-background px-4 pt-2 mb-1">
        <TeamSearch teams={searchTeams} />
        {isGroupStage && <GroupJump groups={groupLetters} />}
      </div>

      {isGroupStage ? (
        <div className="flex flex-col gap-5">
          {groupLetters.map((letter) => {
            const acc = accentForGroup(letter, 0);
            return (
              <div
                key={letter}
                id={`grupo-${letter}`}
                className="flex scroll-mt-28 flex-col gap-3"
              >
                <SectionBanner accent={acc}>Grupo {letter}</SectionBanner>
                {groups.get(letter)!.map((m) => (
                  <Link
                    key={m.id}
                    id={`match-${m.id}`}
                    href={`/visor/${m.id}`}
                    className="block"
                  >
                    <MatchCard
                      accent={acc}
                      status={m.status}
                      home={m.home}
                      away={m.away}
                      homeScore={m.homeScore}
                      awayScore={m.awayScore}
                      kickoff={fmtKickoff(m.kickoffAt)}
                      liveMinute={m.liveMinute}
                      prediction={predFor(m)}
                    />
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((m, i) => (
            <Link
              key={m.id}
              id={`match-${m.id}`}
              href={`/visor/${m.id}`}
              className="block"
            >
              <MatchCard
                accent={accentForGroup(null, i)}
                status={m.status}
                home={m.home}
                away={m.away}
                homeScore={m.homeScore}
                awayScore={m.awayScore}
                kickoff={fmtKickoff(m.kickoffAt)}
                liveMinute={m.liveMinute}
                roundLabel={roundLabel}
                prediction={predFor(m)}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function MatchesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="mb-1 h-10 animate-pulse rounded-full bg-white/8" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-22 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  );
}
