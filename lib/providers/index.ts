import "server-only";
import type { ScoreProvider } from "./types";
import { apiFootballProvider } from "./api-football";
import { worldcup26irProvider } from "./worldcup26ir";

export type { ProviderFixture, ScoreProvider } from "./types";

const PROVIDERS: Record<string, ScoreProvider> = {
  "api-football": apiFootballProvider,
  worldcup26ir: worldcup26irProvider,
};

/**
 * Proveedor de marcadores ACTIVO. Se elige con la env var SCORE_PROVIDER.
 * Default: worldcup26ir (API-Football quedó suspendida; cuando reviva, basta con
 * poner SCORE_PROVIDER=api-football — sin tocar código).
 */
export function getScoreProvider(): ScoreProvider {
  const name = process.env.SCORE_PROVIDER ?? "worldcup26ir";
  return PROVIDERS[name] ?? worldcup26irProvider;
}
