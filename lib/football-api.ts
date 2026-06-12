import "server-only";

/**
 * Cliente de API-Football (api-sports.io). Lo usa SOLO el proceso de sync.
 *
 * CLAVE (verificado contra la API real): el plan GRATIS bloquea el parámetro
 * `season=` para la temporada actual, PERO las consultas por `date=` SÍ devuelven
 * el Mundial 2026 (terminados con marcador de 90', en vivo y programados). Por eso
 * consultamos por fecha y filtramos por liga, en vez de por `league+season`.
 *
 * El Mundial es la liga 1. `score.fulltime` = marcador a los 90' (regla de la polla);
 * `goals` = marcador actual (para mostrar en vivo).
 */
const BASE = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";
const WORLD_CUP_LEAGUE = Number(process.env.FOOTBALL_API_LEAGUE ?? 1);

export interface ApiFixture {
  id: number;
  /** ISO UTC del kickoff. */
  date: string;
  /** Estado corto: NS, 1H, HT, 2H, ET, P, FT, AET, PEN, PST, CANC… */
  statusShort: string;
  homeName: string;
  awayName: string;
  /** Ganó (incluye penales/alargue), lo marca la API en teams.x.winner. */
  homeWinner: boolean | null;
  awayWinner: boolean | null;
  /** Marcador ACTUAL (en vivo o final). Para mostrar en el visor. */
  goals: { home: number | null; away: number | null };
  /** Marcador a los 90' (tiempo reglamentario). Se llena al terminar. Para los puntos. */
  ft: { home: number | null; away: number | null };
}

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

async function getFixtures(path: string): Promise<RawFixture[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) throw new Error("Falta FOOTBALL_API_KEY en el entorno.");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store", // el cron es el dueño del caché; acá pedimos fresco
  });
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`);

  const json = (await res.json()) as { response?: RawFixture[]; errors?: unknown };
  // API-Football devuelve errores en el body con HTTP 200 (ej. límite de plan/quota).
  const errs = json.errors;
  if (errs && !Array.isArray(errs) && Object.keys(errs as object).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(errs)}`);
  }
  return json.response ?? [];
}

function toFixture(r: RawFixture): ApiFixture {
  return {
    id: r.fixture.id,
    date: r.fixture.date,
    statusShort: r.fixture.status.short,
    homeName: r.teams.home.name,
    awayName: r.teams.away.name,
    homeWinner: r.teams.home.winner,
    awayWinner: r.teams.away.winner,
    goals: { home: r.goals.home, away: r.goals.away },
    ft: { home: r.score.fulltime.home, away: r.score.fulltime.away },
  };
}

/**
 * Trae los partidos del Mundial para una o más fechas (YYYY-MM-DD en UTC).
 * Una llamada por fecha. El plan Free solo permite una ventana de hoy ±1 día: si
 * una fecha cae fuera, la API la rechaza y la salteamos (no abortamos el resto).
 */
export async function fetchWorldCupFixturesByDates(dates: string[]): Promise<ApiFixture[]> {
  const byId = new Map<number, ApiFixture>();
  for (const d of dates) {
    let rows: RawFixture[];
    try {
      rows = await getFixtures(`/fixtures?date=${d}`);
    } catch (e) {
      // Fecha fuera de la ventana del plan → la salteamos. Otros errores sí explotan.
      if (e instanceof Error && /this date/i.test(e.message)) continue;
      throw e;
    }
    for (const r of rows) {
      if (r.league?.id === WORLD_CUP_LEAGUE) byId.set(r.fixture.id, toFixture(r));
    }
  }
  return [...byId.values()];
}

/** Estados de API-Football → nuestro enum (scheduled | live | finished). */
export function mapStatus(short: string): "scheduled" | "live" | "finished" {
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "live";
  return "scheduled"; // NS, TBD, PST, CANC, ABD, SUSP, WO, AWD…
}
