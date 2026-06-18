import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScoreProvider, type ProviderFixture } from "@/lib/providers";

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
// START: lo manda NUESTRO kickoff_at (lo sabemos del seed), no la API — no se puede
//   "esperar a que la API diga notstarted→live" porque para leer eso ya habría que
//   estar llamando. Arrancamos 6 min antes del kickoff.
// STOP: lo manda la señal 'finished' de la API. Apenas la API marca FT/AET/PEN,
//   escribimos status='finished' y la corrida siguiente SACA ese partido del gate.
//   El tope de 2h45 es solo la red de seguridad por si la API nunca marca finished.
const ACTIVE_BEFORE_MS = 6 * 60_000; // arranca a chequear 6 min antes del kickoff
const ACTIVE_AFTER_MS = 165 * 60_000; // tope 2h45 (cubre 90'+alargue+penales+demoras)

// El cron corre cada minuto; este throttle solo evita un doble-fire (sync + reconcile,
// o jitter del scheduler). worldcup26.ir no tiene cuota diaria, así que no hay quota
// que proteger — por eso 30s, holgado para no bloquear una corrida legítima de 1 min.
const THROTTLE_MS = 30_000;

const DAY_MS = 24 * 3_600_000;
// Tolerancia al emparejar par-de-equipos por fecha: absorbe el corrimiento de día
// (openfootball guarda hora local, la API usa UTC) sin confundir grupos vs eliminatorias.
const MATCH_TOLERANCE_MS = 2 * DAY_MS;

/** Normaliza un nombre de selección para emparejar (sin acentos ni símbolos). */
const DIACRITICS = /[̀-ͯ]/g;
function norm(name: string | null | undefined): string {
  return (name ?? "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Alias para nombres que difieren entre openfootball (BD) y API-Football (ya normalizados). */
const ALIAS: Record<string, string> = {
  unitedstates: "usa",
  korearepublic: "southkorea",
  republicofkorea: "southkorea",
  czechia: "czechrepublic",
  cotedivoire: "ivorycoast",
  congodr: "drcongo",
  // worldcup26.ir usa nombres largos; la BD (openfootball) usa formas cortas.
  bosniaandherzegovina: "bosniaherzegovina",
  democraticrepublicofthecongo: "drcongo",
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
  home_score: number | null;
  away_score: number | null;
  advancer: string | null;
  live_minute: string | null;
}

/** Carga los partidos de la BD con el nombre de cada equipo. */
async function loadDbMatches(db: ReturnType<typeof createAdminClient>): Promise<DbMatch[]> {
  const [{ data: rows }, { data: teams }] = await Promise.all([
    db
      .from("matches")
      .select(
        "id, api_fixture_id, source, status, kickoff_at, home_team_id, away_team_id, home_score, away_score, advancer, live_minute",
      ),
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
    home_score: r.home_score,
    away_score: r.away_score,
    advancer: r.advancer,
    live_minute: r.live_minute,
  }));
}

/**
 * Empareja cada fixture de la API con un partido de la BD y escribe los cambios.
 * Match: primero por api_fixture_id; si no, por par-de-equipos + kickoff más cercano
 * (tolerante al corrimiento de día). Corrige el horario (UTC real) y el marcador.
 */
async function applyFixtures(
  db: ReturnType<typeof createAdminClient>,
  fixtures: ProviderFixture[],
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
    // Placeholders de eliminatoria (sin equipos definidos) → nada que emparejar.
    if (!f.homeName || !f.awayName) continue;

    let match = (f.providerId != null ? byApiId.get(f.providerId) : null) ?? null;
    if (!match) {
      // Par de equipos + kickoff más cercano dentro de la tolerancia.
      const cands = (byPair.get(pairKey(f.homeName, f.awayName)) ?? []).filter(
        (m) => !used.has(m.id),
      );
      const apiMs = new Date(f.matchAt).getTime();
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
      unmatched.push(`${f.homeName} vs ${f.awayName} (${day(new Date(f.matchAt))})`);
      continue;
    }
    used.add(match.id);
    matched++;

    // Solo escribimos lo que CAMBIÓ (worldcup26.ir trae los 104; evita writes al pedo).
    const patch: Record<string, unknown> = {};
    if (f.kickoffAtUtc && match.kickoff_at !== f.kickoffAtUtc) patch.kickoff_at = f.kickoffAtUtc;
    if (f.providerId != null && !match.api_fixture_id) patch.api_fixture_id = f.providerId;

    // Marcador/estado: NO pisamos un marcador corregido a mano por el admin.
    if (match.source !== "manual") {
      // El estado NO retrocede de 'finished': football-data (free) a veces rebota
      // a IN_PLAY al cerrar un partido. Ignoramos ese rebote para que no parpadee
      // entre "En vivo" y "Final". (Un partido terminado no vuelve a jugarse.)
      const effStatus =
        match.status === "finished" && f.status !== "finished" ? "finished" : f.status;
      if (effStatus !== match.status) patch.status = effStatus;
      if (effStatus === "finished" && f.ft.home != null && f.ft.away != null) {
        // Terminado → marcador de 90' (lo que cuenta para los puntos).
        const adv =
          f.ft.home === f.ft.away ? (f.homeWinner ? "home" : f.awayWinner ? "away" : null) : null;
        if (match.home_score !== f.ft.home) patch.home_score = f.ft.home;
        if (match.away_score !== f.ft.away) patch.away_score = f.ft.away;
        if (match.advancer !== adv) patch.advancer = adv;
        if (match.source !== "api") patch.source = "api";
        if (match.live_minute !== null) patch.live_minute = null;
      } else if (effStatus === "live") {
        // En vivo (solo para mostrar). Aplicamos el marcador de la API SOLO si trae
        // datos reales; si viene null (glitch/respuesta parcial), NO pisamos el
        // marcador guardado — un 1-0 real no debe volver a 0-0 por un bache de la API.
        // Solo cuando el partido recién arranca y aún no hay marcador, mostramos 0-0.
        if (f.goals.home != null && f.goals.away != null) {
          if (match.home_score !== f.goals.home) patch.home_score = f.goals.home;
          if (match.away_score !== f.goals.away) patch.away_score = f.goals.away;
        } else if (match.home_score == null || match.away_score == null) {
          patch.home_score = 0;
          patch.away_score = 0;
        }
        if (match.live_minute !== f.liveMinute) patch.live_minute = f.liveMinute;
        if (match.source !== "api") patch.source = "api";
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
 * Sync de marcadores en vivo (la corre el cron CADA MINUTO). Es la ÚNICA que llama
 * a la API junto con reconcile. Las páginas leen siempre de la BD.
 *
 * Cron inteligente en dos pasos:
 *  1. Gate BARATO: un solo COUNT (sin traer filas) — ¿hay algún partido en ventana
 *     activa y sin terminar? Si no, salimos sin tocar settings ni la API. Así un
 *     minuto ocioso cuesta 1 query, no 3 ni una llamada externa.
 *  2. Solo si hay partido activo: cargamos todo y sincronizamos.
 * `force` mira más adelante (24h) para el reconcile manual del admin.
 */
export async function syncMatches(force = false): Promise<SyncResult> {
  const db = createAdminClient();
  const nowMs = Date.now();
  const skip: SyncResult = { ok: true, updated: 0, matched: 0, total: 0, unmatched: [], skipped: true };

  const aheadMs = force ? DAY_MS : ACTIVE_BEFORE_MS;
  const lo = nowMs - ACTIVE_AFTER_MS;
  const hi = nowMs + aheadMs;

  // 1. Gate barato. status es NOT NULL default 'scheduled', así que neq('finished')
  //    es seguro (no hay nulls que se escapen del filtro).
  const { count } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .neq("status", "finished")
    .gte("kickoff_at", new Date(lo).toISOString())
    .lte("kickoff_at", new Date(hi).toISOString());
  if (!count) return skip;

  // Throttle: evita doble-fire (sync + reconcile, o jitter del cron de 1 min).
  const { data: cfg } = await db.from("settings").select("last_sync_at").eq("id", 1).maybeSingle();
  if (cfg?.last_sync_at && nowMs - new Date(cfg.last_sync_at).getTime() < THROTTLE_MS) return skip;

  // 2. Hay partido activo → cargar todo y sincronizar.
  const dbMatches = await loadDbMatches(db);
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
  const provider = getScoreProvider();
  let fixtures: ProviderFixture[];
  try {
    fixtures = await provider.fetchFixtures(dates);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error al llamar a la API";
    // Queda en los logs de Vercel Functions para poder diagnosticar caídas/quota.
    console.error(`[sync] proveedor "${provider.name}" falló:`, error);
    return { ok: false, updated: 0, matched: 0, total: 0, unmatched: [], error };
  }

  const { matched, updated, unmatched } = await applyFixtures(db, fixtures, dbMatches);
  await db.from("settings").update({ last_sync_at: new Date().toISOString() }).eq("id", 1);
  return { ok: true, updated, matched, total: fixtures.length, unmatched };
}
