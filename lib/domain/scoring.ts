/**
 * Lógica de puntaje de la polla. PURA: sin framework, sin DB.
 * Es la fuente de verdad del dominio y DEBE coincidir con la vista
 * `prediction_points` en supabase/migrations/0001_init.sql.
 *
 * Reglas:
 *  - Marcador exacto (local y visitante exactos) => 3 puntos
 *  - Resultado acertado (mismo ganador, o empate) => 1 punto
 *  - Errado                                        => 0 puntos
 */

export const POINTS_EXACT = 3 as const;
export const POINTS_RESULT = 1 as const;
export const POINTS_MISS = 0 as const;

export type Outcome = "home" | "away" | "draw";
export type HitKind = "exact" | "result" | "miss";

export interface Score {
  home: number;
  away: number;
}

/** Ganador del partido según el marcador. */
export function outcome(score: Score): Outcome {
  if (score.home > score.away) return "home";
  if (score.home < score.away) return "away";
  return "draw";
}

/** Puntos de una predicción contra el marcador real (ambos conocidos). */
export function scorePrediction(pred: Score, actual: Score): number {
  if (pred.home === actual.home && pred.away === actual.away) return POINTS_EXACT;
  if (outcome(pred) === outcome(actual)) return POINTS_RESULT;
  return POINTS_MISS;
}

/** Clasificación de una predicción: exact | result | miss. */
export function classify(pred: Score, actual: Score): HitKind {
  if (pred.home === actual.home && pred.away === actual.away) return "exact";
  if (outcome(pred) === outcome(actual)) return "result";
  return "miss";
}
