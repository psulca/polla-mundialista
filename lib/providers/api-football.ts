import "server-only";
import type { ProviderFixture, ScoreProvider } from "./types";

/**
 * Adaptador de API-Football (api-sports.io). Misma lógica de siempre.
 *
 * CLAVE (verificado contra la API real): el plan GRATIS bloquea `season=` para la
 * temporada actual, PERO las consultas por `date=` SÍ devuelven el Mundial 2026.
 * Por eso consultamos por fecha y filtramos por liga. El Mundial es la liga 1.
 * `score.fulltime` = marcador a los 90' (regla de la polla); `goals` = actual.
 *
 * Para reactivarlo: SCORE_PROVIDER=api-football (ver lib/providers/index.ts).
 */
const BASE = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE = Number(process.env.FOOTBALL_API_LEAGUE ?? 1);

interface RawFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number };
  teams: {
    home: { name: string; winner: boolean | null };
    away: { name: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: { fulltime: { home: number | null; away: number | null } };
}

/** Estados de API-Football → nuestro enum. */
function mapStatus(short: string): "scheduled" | "live" | "finished" {
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "live";
  return "scheduled"; // NS, TBD, PST, CANC, ABD, SUSP, WO, AWD…
}

async function getFixtures(path: string): Promise<RawFixture[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("Falta FOOTBALL_API_KEY en el entorno.");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`);

  const json = (await res.json()) as { response?: RawFixture[]; errors?: unknown };
  // API-Football devuelve errores en el body con HTTP 200 (quota, cuenta suspendida…).
  const errs = json.errors;
  if (errs && !Array.isArray(errs) && Object.keys(errs as object).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(errs)}`);
  }
  return json.response ?? [];
}

function toFixture(r: RawFixture): ProviderFixture {
  return {
    providerId: r.fixture.id,
    matchAt: r.fixture.date,
    kickoffAtUtc: r.fixture.date, // API-Football SÍ da UTC real
    status: mapStatus(r.fixture.status.short),
    homeName: r.teams.home.name,
    awayName: r.teams.away.name,
    goals: { home: r.goals.home, away: r.goals.away },
    ft: { home: r.score.fulltime.home, away: r.score.fulltime.away },
    homeWinner: r.teams.home.winner,
    awayWinner: r.teams.away.winner,
    liveMinute: null, // api-football expone elapsed pero está suspendida; se añade cuando se reactive
  };
}

export const apiFootballProvider: ScoreProvider = {
  name: "api-football",
  async fetchFixtures(dates: string[]): Promise<ProviderFixture[]> {
    const byId = new Map<number, ProviderFixture>();
    for (const d of dates) {
      let rows: RawFixture[];
      try {
        rows = await getFixtures(`/fixtures?date=${d}`);
      } catch (e) {
        // Fecha fuera de la ventana del plan free → saltear. Otros errores explotan.
        if (e instanceof Error && /this date/i.test(e.message)) continue;
        throw e;
      }
      for (const r of rows) {
        if (r.league?.id === WORLD_CUP_LEAGUE) byId.set(r.fixture.id, toFixture(r));
      }
    }
    return [...byId.values()];
  },
};
