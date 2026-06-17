import "server-only";
import type { ScoreProvider } from "./types";
import { apiFootballProvider } from "./api-football";
import { worldcup26irProvider } from "./worldcup26ir";
import { footballDataProvider } from "./football-data";

export type { ProviderFixture, ScoreProvider } from "./types";

const PROVIDERS: Record<string, ScoreProvider> = {
  "api-football": apiFootballProvider,
  worldcup26ir: worldcup26irProvider,
  "football-data": footballDataProvider,
};

const DEFAULT_PROVIDER = "football-data";

/**
 * Proveedor de marcadores ACTIVO. Se elige con la env var SCORE_PROVIDER.
 * Default: football-data (football-data.org). worldcup26.ir se caía y actualizaba
 * a mano; football-data da minuto en vivo y entretiempo automáticos. Para cambiar
 * de fuente basta con setear SCORE_PROVIDER — sin tocar código.
 */
export function getScoreProvider(): ScoreProvider {
  const name = process.env.SCORE_PROVIDER ?? DEFAULT_PROVIDER;
  return PROVIDERS[name] ?? PROVIDERS[DEFAULT_PROVIDER];
}
