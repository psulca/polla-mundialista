/**
 * Los DOS RELOJES de la polla. PURO: sin framework, sin DB.
 *
 *  - 🔒 Bloqueo (no se puede editar la predicción): depende de `lock_mode`.
 *      · per_match    => se bloquea en el kickoff del propio partido.
 *      · per_matchday => se bloquea cuando arranca el PRIMER partido de la ronda.
 *  - 👁️ Revelado (los demás ven tu pick): SIEMPRE en el kickoff del partido,
 *      sin importar el modo de bloqueo.
 *
 * Toda decisión real se toma en el servidor con la hora del servidor.
 */

export type LockMode = "per_match" | "per_matchday";

export interface MatchTiming {
  /** Kickoff de este partido. */
  kickoffAt: Date;
  /** Kickoff del primer partido de la ronda (para per_matchday). */
  roundFirstKickoffAt: Date;
}

function asDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Momento en que la predicción de este partido se congela (no editable). */
export function lockAt(timing: MatchTiming, mode: LockMode): Date {
  return mode === "per_matchday"
    ? asDate(timing.roundFirstKickoffAt)
    : asDate(timing.kickoffAt);
}

/** ¿La predicción ya está bloqueada (no editable) a la hora `now`? */
export function isLocked(timing: MatchTiming, mode: LockMode, now: Date): boolean {
  return now.getTime() >= lockAt(timing, mode).getTime();
}

/**
 * ¿Las predicciones ajenas de este partido ya son visibles?
 * El revelado SIEMPRE ocurre en el kickoff del partido.
 */
export function isRevealed(kickoffAt: Date | string | number, now: Date): boolean {
  return now.getTime() >= asDate(kickoffAt).getTime();
}

/**
 * ¿Se puede ENVIAR/EDITAR una predicción para este partido ahora mismo?
 * Requiere: ronda abierta Y no bloqueado todavía.
 * (La verificación de membresía `approved` se hace aparte, en la capa de datos.)
 */
export function canSubmitPrediction(params: {
  timing: MatchTiming;
  mode: LockMode;
  roundIsOpen: boolean;
  now: Date;
}): boolean {
  const { timing, mode, roundIsOpen, now } = params;
  return roundIsOpen && !isLocked(timing, mode, now);
}
