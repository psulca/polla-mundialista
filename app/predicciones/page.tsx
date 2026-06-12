import { Suspense } from "react";
import Link from "next/link";
import { requireApproved } from "@/lib/auth/current-player";
import { getPredictionScreen } from "@/lib/data/predicciones";
import { getRounds } from "@/lib/data/visor";
import {
  PredictionEditor,
  type PredMatchDTO,
} from "@/components/predicciones/prediction-editor";
import { Screen } from "@/components/brand/screen";
import { HScroll } from "@/components/brand/h-scroll";
import { fmtKickoff } from "@/lib/format";
import { cn } from "@/lib/utils";

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <Screen>
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="rounded-2xl border border-border bg-card px-6 py-8 text-muted-foreground">
          {children}
        </p>
        <Link href="/" className="mt-4 text-xs font-semibold uppercase tracking-wider text-neon">
          Ir al inicio
        </Link>
      </div>
    </Screen>
  );
}

export default async function PrediccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ronda?: string }>;
}) {
  const player = await requireApproved();
  const { ronda } = await searchParams;

  // Solo las fechas abiertas (rápido) → pastillas al instante.
  const rounds = await getRounds();
  const openRounds = rounds.filter((r) => r.is_open);
  const current = (ronda ? rounds.find((r) => r.key === ronda) : null) ?? openRounds[0] ?? null;
  if (!current) return <Gate>No hay ninguna fecha abierta todavía. ¡Pronto!</Gate>;

  const header = (
    <>
      <h1 className="font-display text-4xl text-foreground">Predecir</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Hola, <span className="font-bold text-foreground">{player.displayName}</span>
      </p>
      {openRounds.length > 1 && (
        <HScroll className="-mx-4 mt-4">
          <div className="flex gap-2 px-4">
            {openRounds.map((r) => (
              <Link
                key={r.id}
                href={`/predicciones?ronda=${r.key}`}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  r.id === current.id
                    ? "bg-neon text-black"
                    : "bg-white/8 text-muted-foreground hover:bg-white/12",
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </HScroll>
      )}
    </>
  );

  return (
    <Screen header={header}>
      {/* Los partidos cargan en su contenedor: skeleton al cambiar de fecha. */}
      <Suspense key={current.id} fallback={<PredSkeleton />}>
        <PredBody playerId={player.id} ronda={ronda} />
      </Suspense>
    </Screen>
  );
}

async function PredBody({ playerId, ronda }: { playerId: string; ronda?: string }) {
  const { current, matches } = await getPredictionScreen(playerId, ronda);
  if (!current) return null; // la página ya filtró este caso

  const dto: PredMatchDTO[] = matches.map((m) => ({
    id: m.id,
    groupLetter: m.groupLetter,
    kickoff: fmtKickoff(m.kickoffAt),
    locked: m.locked,
    home: m.home,
    away: m.away,
    pred: m.pred,
  }));

  return <PredictionEditor matches={dto} roundLabel={current.label} />;
}

function PredSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="mb-1 h-12 animate-pulse rounded-xl bg-white/8" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-border bg-card"
        />
      ))}
    </div>
  );
}
