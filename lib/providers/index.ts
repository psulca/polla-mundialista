import "server-only";
import type { ProviderFixture, ScoreProvider } from "./types";
import { apiFootballProvider } from "./api-football";
import { worldcup26irProvider } from "./worldcup26ir";
import { footballDataProvider } from "./football-data";

export type { ProviderFixture, ScoreProvider } from "./types";

/**
 * Compone proveedores en CADENA: usa el primero que responda con datos. Si uno
 * tira error o devuelve 0 fixtures, pasa al siguiente. Si todos fallan, relanza
 * el último error (el sync lo loguea y el banner de "stale" avisa al usuario).
 */
function fallbackProvider(chain: ScoreProvider[]): ScoreProvider {
  return {
    name: `auto(${chain.map((p) => p.name).join("→")})`,
    async fetchFixtures(dates: string[]): Promise<ProviderFixture[]> {
      let lastErr: unknown = null;
      for (const p of chain) {
        try {
          const fx = await p.fetchFixtures(dates);
          if (fx.length > 0) return fx;
          console.warn(`[providers] ${p.name} devolvió 0 fixtures → probando el siguiente`);
        } catch (e) {
          lastErr = e;
          console.error(
            `[providers] ${p.name} falló → probando el siguiente:`,
            e instanceof Error ? e.message : e,
          );
        }
      }
      if (lastErr) throw lastErr;
      return [];
    },
  };
}

// Cadena por defecto: football-data (UTC real, confiable) primero; worldcup26.ir
// como respaldo si football-data falla o viene vacío.
const autoProvider = fallbackProvider([footballDataProvider, worldcup26irProvider]);

const PROVIDERS: Record<string, ScoreProvider> = {
  auto: autoProvider,
  "api-football": apiFootballProvider,
  worldcup26ir: worldcup26irProvider,
  "football-data": footballDataProvider,
};

const DEFAULT_PROVIDER = "auto";

/**
 * Proveedor de marcadores ACTIVO. Se elige con la env var SCORE_PROVIDER.
 * Default: "auto" = football-data con worldcup26.ir de respaldo. Para forzar uno
 * solo, SCORE_PROVIDER=football-data | worldcup26ir | api-football — sin tocar código.
 */
export function getScoreProvider(): ScoreProvider {
  const name = process.env.SCORE_PROVIDER ?? DEFAULT_PROVIDER;
  return PROVIDERS[name] ?? autoProvider;
}
