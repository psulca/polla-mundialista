import "server-only";

/**
 * Puerto (hexagonal): un proveedor de marcadores entrega "fixtures" en ESTE formato
 * normalizado, sin importar de qué API venga. El sync (lib/sync-matches.ts) depende
 * solo de esto, no de un proveedor concreto. Para cambiar de fuente, se enchufa otro
 * adaptador (ver lib/providers/index.ts) — cero cambios en la lógica de sync.
 */
export interface ProviderFixture {
  /** id estable del proveedor para linkear (api_fixture_id). null si no aplica. */
  providerId: number | null;
  /** Fecha/hora SOLO para emparejar. Puede ser local sin offset: la tolerancia de
   *  ±2 días en el match la absorbe. No se usa para corregir el horario. */
  matchAt: string;
  /** Kickoff en UTC real para CORREGIR el horario en la BD. null = no tocar
   *  (el proveedor no da UTC confiable; confiamos en el horario ya sembrado). */
  kickoffAtUtc: string | null;
  status: "scheduled" | "live" | "finished";
  homeName: string;
  awayName: string;
  /** Marcador ACTUAL (en vivo o final). Para mostrar. */
  goals: { home: number | null; away: number | null };
  /** Marcador a los 90' (lo que cuenta para los puntos). Suele igualar a goals al terminar. */
  ft: { home: number | null; away: number | null };
  /** Quién avanzó (para empates de eliminatoria). null si el proveedor no lo expone. */
  homeWinner: boolean | null;
  awayWinner: boolean | null;
  /** Minuto del reloj en vivo: número ("45") o "HT". null si no está en juego. */
  liveMinute: string | null;
}

/** Adaptador de una fuente de marcadores. */
export interface ScoreProvider {
  readonly name: string;
  /**
   * Trae los fixtures relevantes. `dates` (YYYY-MM-DD UTC) es una PISTA para los
   * proveedores que filtran por fecha; los que devuelven todo el torneo la ignoran.
   */
  fetchFixtures(dates: string[]): Promise<ProviderFixture[]>;
}
