import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getRounds,
  getCurrentRound,
  getMatchesForRound,
  type VisorMatch,
  type RoundRow,
} from "./visor";
import { isLocked, type LockMode } from "@/lib/domain/locking";

export interface PredMatch extends VisorMatch {
  locked: boolean;
  pred: { home: number; away: number } | null;
}

export interface PredictionScreen {
  rounds: RoundRow[];
  openRounds: RoundRow[];
  current: RoundRow | null;
  matches: PredMatch[];
  filledCount: number;
}

/** Datos de la pantalla de carga de predicciones para un jugador y una ronda. */
export async function getPredictionScreen(
  playerId: string,
  roundKey?: string,
): Promise<PredictionScreen> {
  const db = createAdminClient();
  const rounds = await getRounds();
  const openRounds = rounds.filter((r) => r.is_open);
  // Si no piden una fecha puntual: la abierta; si no hay abierta, la "frontera"
  // (la actual del torneo) en SOLO LECTURA, para que siempre puedas ver tus picks.
  const current =
    (roundKey ? rounds.find((r) => r.key === roundKey) : null) ??
    openRounds[0] ??
    (await getCurrentRound());

  if (!current) {
    return { rounds, openRounds, current: null, matches: [], filledCount: 0 };
  }

  const [baseMatches, predsRes] = await Promise.all([
    getMatchesForRound(current.id),
    db.from("predictions").select("match_id, pred_home, pred_away").eq("player_id", playerId),
  ]);

  const lockMode = (current.lock_mode ?? "per_match") as LockMode;
  const predMap = new Map(
    (predsRes.data ?? []).map((p) => [p.match_id, { home: p.pred_home, away: p.pred_away }]),
  );
  const now = new Date();
  const firstKickoff = baseMatches.reduce<string | null>(
    (min, m) => (!min || m.kickoffAt < min ? m.kickoffAt : min),
    null,
  );

  const matches: PredMatch[] = baseMatches.map((m) => ({
    ...m,
    // Bloqueado = la fecha no está abierta, O el partido ya se congeló por tiempo.
    // (Si la fecha está cerrada, TODO queda solo-lectura.)
    locked:
      !current.is_open ||
      isLocked(
        {
          kickoffAt: new Date(m.kickoffAt),
          roundFirstKickoffAt: new Date(firstKickoff ?? m.kickoffAt),
        },
        lockMode,
        now,
      ),
    pred: predMap.get(m.id) ?? null,
  }));

  return {
    rounds,
    openRounds,
    current,
    matches,
    filledCount: matches.filter((m) => m.pred).length,
  };
}
