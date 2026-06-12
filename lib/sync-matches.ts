import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchWorldCupFixturesByDates,
  mapStatus,
  type ApiFixture,
} from "@/lib/football-api";

export interface SyncResult {
  ok: boolean;
  updated: number;
  matched: number;
  total: number;
  /** Partidos de la API que no se pudieron emparejar (para depurar nombres). */
  unmatched: string[];
  /** true si no se gastó llamada a la API (sin partido activo, o throttle). */
  skipped?: boolean;
  error?: string;
}

// Ventana en la que un partido puede tener marcador nuevo.
// El que un partido esté 'finished' lo SACA del gate, así que dejamos de pedir su
// fecha apenas la API lo marca FT/AET/PEN. La ventana es el tope para el caso raro.
const ACTIVE_BEFORE_MS = 6 * 60_000; // arranca a chequear 6 min antes del kickoff
const ACTIVE_AFTER_MS = 165 * 60_000; // tope 2h45 (cubre 90'+alargue+penales+demoras)

// Nunca llamamos a la API si ya llamamos hace menos de esto (protege la quota).
const THROTTLE_MS = 60_000;

const DAY_MS = 24 * 3_600_000;
// Tolerancia al emparejar par-de-equipos por fecha: absorbe el corrimiento de día
// (openfootball guarda hora local, la API usa UTC) sin confundir grupos vs eliminatorias.
const MATCH_TOLERANCE_MS = 2 * DAY_MS;

/** Normaliza un nombre de selección para emparejar (sin acentos ni símbolos). */
const DIACRITICS = /[̀-ͯ]/g;
function norm(name: string): string {
  return name.normalize("NFD").replace(DIACRITICS, "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Alias para nombres que difieren entre openfootball (BD) y API-Football (ya normalizados). */
const ALIAS: Record<string, string> = {
  unitedstates: "usa",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  czechia: "czechrepublic",
  cotedivoire: "ivorycoast",
  congodr: "drcongo",
  irra: "iran",
  turkiye: "turkey",
};

function key(name: string): string {
  const n = norm(name);
  return ALIAS[n] ?? n;
}

/** Clave del cruce, sin importar quién es local/visitante. */
function pairKey(a: string, b: string): string {
  return [key(a), key(b)].sort().join("|");
}

/** Día calendario en UTC (YYYY-MM-DD). */
function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DbMatch {
  id: number;
  api_fixture_id: number | null;
  source: string | null;
  status: string | null;
  home: string;
  away: string;
  kickoff_at: string;
}

/** Carga los partidos de la BD con el nombre de cada equipo. */
async function loadDbMatches(db: ReturnType<typeof createAdminClient>): Promise<DbMatch[]> {
  const [{ data: rows }, { data: teams }] = await Promise.all([
    db
      .from("matches")
      .select("id, api_fixture_id, source, status, kickoff_at, home_team_id, away_team_id"),
    db.from("teams").select("id, name"),
  ]);
  const teamName = new Map<number, string>((teams ?? []).map((t) => [t.id, t.name ?? ""]));
  return (rows ?? []).map((r) => ({
    id: r.id,
    api_fixture_id: r.api_fixture_id,
    source: r.source,
    status: r.status,
    kickoff_at: r.kickoff_at,
    home: r.home_team_id ? teamName.get(r.home_team_id) ?? "" : "",
    away: r.away_team_id ? teamName.get(r.away_team_id) ?? "" : "",
  }));
}

/**
 * Empareja cada fixture de la API con un partido de la BD y escribe los cambios.
 * Match: primero por api_fixture_id; si no, por par-de-equipos + kickoff más cercano
 * (tolerante al corrimiento de día). Corrige el horario (UTC real) y el marcador.
 */
async function applyFixtures(
  db: ReturnType<typeof createAdminClient>,
  fixtures: ApiFixture[],
  dbMatches: DbMatch[],
): Promise<{ matched: number; updated: number; unmatched: string[] }> {
  const byApiId = new Map<number, DbMatch>();
  const byPair = new Map<string, DbMatch[]>();
  for (const m of dbMatches) {
    if (m.api_fixture_id) byApiId.set(m.api_fixture_id, m);
    if (m.home && m.away) {
      const k = pairKey(m.home, m.away);
      (byPair.get(k) ?? byPair.set(k, []).get(k)!).push(m);
    }
  }

  const used = new Set<number>();
  const unmatched: string[] = [];
  let matched = 0;
  let updated = 0;

  for (const f of fixtures) {
    let match = byApiId.get(f.id) ?? null;
    if (!match) {
      // Par de equipos + kickoff más cercano dentro de la tolerancia.
      const cands = (byPair.get(pairKey(f.homeName, f.awayName)) ?? []).filter(
        (m) => !used.has(m.id),
      );
      const apiMs = new Date(f.date).getTime();
      let best: DbMatch | null = null;
      let bestDiff = Infinity;
      for (const c of cands) {
        const diff = Math.abs(new Date(c.kickoff_at).getTime() - apiMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = c;
        }
      }
      if (best && bestDiff <= MATCH_TOLERANCE_MS) match = best;
    }

    if (!match) {
      unmatched.push(`${f.homeName} vs ${f.awayName} (${day(new Date(f.date))})`);
      continue;
    }
    used.add(match.id);
    matched++;

    const patch: Record<string, unknown> = {};
    if (match.kickoff_at !== f.date) patch.kickoff_at = f.date; // horario UTC real
    if (!match.api_fixture_id) patch.api_fixture_id = f.id; // linkea para próximas syncs

    // Marcador/estado: NO pisamos un marcador corregido a mano por el admin.
    if (match.source !== "manual") {
      const status = mapStatus(f.statusShort);
      patch.status = status;
      if (status === "finished" && f.ft.home != null && f.ft.away != null) {
        // Terminado → marcador de 90' (lo que cuenta para los puntos).
        patch.home_score = f.ft.home;
        patch.away_score = f.ft.away;
        patch.source = "api";
        patch.advancer =
          f.ft.home === f.ft.away ? (f.homeWinner ? "home" : f.awayWinner ? "away" : null) : null;
      } else if (status === "live") {
        // En vivo → marcador actual (solo para mostrar; los puntos se calculan al terminar).
        // Apenas arranca, la API puede traer goals en null: lo tratamos como 0-0 para
        // que el visor no siga mostrando guiones con el partido ya en juego.
        patch.home_score = f.goals.home ?? 0;
        patch.away_score = f.goals.away ?? 0;
        patch.source = "api";
      }
    }

    if (Object.keys(patch).length > 0) {
      await db.from("matches").update(patch).eq("id", match.id);
      updated++;
    }
  }

  return { matched, updated, unmatched };
}

/**
 * Sync de marcadores en vivo (la corre el cron cada 6 min). Es la ÚNICA que llama
 * a la API junto con reconcile. Las páginas leen siempre de la BD.
 *
 * Cron inteligente: solo pide las fechas (UTC) de partidos en ventana activa. Si no
 * hay ninguno, no gasta llamada (`skipped`). `force` mira más adelante (24h).
 */
export async function syncMatches(force = false): Promise<SyncResult> {
  const db = createAdminClient();
  const nowMs = Date.now();
  const skip: SyncResult = { ok: true, updated: 0, matched: 0, total: 0, unmatched: [], skipped: true };

  const { data: cfg } = await db.from("settings").select("last_sync_at").eq("id", 1).maybeSingle();
  if (cfg?.last_sync_at && nowMs - new Date(cfg.last_sync_at).getTime() < THROTTLE_MS) return skip;

  const dbMatches = await loadDbMatches(db);

  const aheadMs = force ? DAY_MS : ACTIVE_BEFORE_MS;
  const lo = nowMs - ACTIVE_AFTER_MS;
  const hi = nowMs + aheadMs;
  const dates = new Set<string>();
  for (const m of dbMatches) {
    if (m.status === "finished") continue;
    const k = new Date(m.kickoff_at).getTime();
    if (k >= lo && k <= hi) dates.add(day(new Date(m.kickoff_at)));
  }
  if (dates.size === 0) return skip;

  return runFetch(db, dbMatches, [...dates]);
}

/**
 * Reconcilia la ventana que el plan Free permite: ayer, hoy y mañana (UTC). Trae los
 * partidos del Mundial de esas fechas, corrige horarios (openfootball viene en hora
 * local), linkea api_fixture_id y carga marcadores. La corre el admin a mano o un
 * cron diario. 3 llamadas. (Fechas fuera de la ventana del plan se saltean solas.)
 */
export async function reconcileFixtures(): Promise<SyncResult> {
  const db = createAdminClient();
  const nowMs = Date.now();

  const { data: cfg } = await db.from("settings").select("last_sync_at").eq("id", 1).maybeSingle();
  if (cfg?.last_sync_at && nowMs - new Date(cfg.last_sync_at).getTime() < THROTTLE_MS) {
    return { ok: true, updated: 0, matched: 0, total: 0, unmatched: [], skipped: true };
  }

  const dbMatches = await loadDbMatches(db);
  const dates = [day(new Date(nowMs - DAY_MS)), day(new Date(nowMs)), day(new Date(nowMs + DAY_MS))];
  return runFetch(db, dbMatches, dates);
}

/** Llama a la API por las fechas dadas, aplica los cambios y sella last_sync_at. */
async function runFetch(
  db: ReturnType<typeof createAdminClient>,
  dbMatches: DbMatch[],
  dates: string[],
): Promise<SyncResult> {
  let fixtures: ApiFixture[];
  try {
    fixtures = await fetchWorldCupFixturesByDates(dates);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error al llamar a la API";
    // Queda en los logs de Vercel Functions para poder diagnosticar caídas/quota.
    console.error("[sync] fallo al consultar API-Football:", error);
    return { ok: false, updated: 0, matched: 0, total: 0, unmatched: [], error };
  }

  const { matched, updated, unmatched } = await applyFixtures(db, fixtures, dbMatches);
  await db.from("settings").update({ last_sync_at: new Date().toISOString() }).eq("id", 1);
  return { ok: true, updated, matched, total: fixtures.length, unmatched };
}
