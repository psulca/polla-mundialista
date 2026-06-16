import "server-only";
import type { ProviderFixture, ScoreProvider } from "./types";

/**
 * Adaptador de worldcup26.ir — API free hecha para el Mundial 2026.
 * Una sola llamada (`/get/games`) trae los 104 partidos. Sin cuota diaria. Los GET
 * son públicos (no requieren token ni registro).
 *
 * Por qué bulk y NO el endpoint por-partido (verificado contra la API real):
 *  - `/get/game/{_id}` existe, pero pide el ObjectId de Mongo (no guardamos ese id,
 *    providerId va null a propósito) y NO devuelve los *_name_en → rompe el matching
 *    por nombre. `/get/games?id=` ignora el filtro. Y N partidos serían N requests.
 *  - 1 request trae todo, con nombres, haya 1 o 6 en vivo. Imposible ser más eficiente.
 *
 * OJO: `local_date` viene en hora LOCAL de la sede SIN offset → no la usamos para
 * corregir el horario (kickoffAtUtc = null); el horario ya quedó bien del seed.
 * No expone "ganador", así que el advancer de empates de eliminatoria va a mano.
 */
const BASE = process.env.WORLDCUP26_BASE ?? "https://worldcup26.ir";

interface RawGame {
  id: string;
  home_score: string | null;
  away_score: string | null;
  finished: string; // "TRUE" | "FALSE"
  time_elapsed: string; // "finished" | "notstarted" | minuto en vivo
  local_date: string; // "MM/DD/YYYY HH:MM"
  home_team_name_en: string;
  away_team_name_en: string;
}

function num(s: string | null): number | null {
  if (s == null) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function statusOf(g: RawGame): "scheduled" | "live" | "finished" {
  if (g.finished === "TRUE" || /finish/i.test(g.time_elapsed ?? "")) return "finished";
  const t = (g.time_elapsed ?? "").toLowerCase();
  if (t && t !== "notstarted" && t !== "scheduled" && t !== "ns") return "live";
  return "scheduled";
}

// "06/11/2026 13:00" → ISO. SOLO para emparejar (la tolerancia de ±2 días absorbe
// que sea local sin offset). NO se usa como kickoff real.
function parseMatchAt(local: string): string {
  const m = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/.exec(local ?? "");
  if (!m) return new Date(0).toISOString();
  const [, mm, dd, yyyy, hh, min] = m;
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`;
}

function liveMinuteOf(g: RawGame, status: "scheduled" | "live" | "finished"): string | null {
  if (status !== "live") return null;
  const t = (g.time_elapsed ?? "").trim().toUpperCase();
  if (t === "HT") return "HT";
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? String(n) : null;
}

function toFixture(g: RawGame): ProviderFixture {
  const home = num(g.home_score);
  const away = num(g.away_score);
  const status = statusOf(g);
  return {
    providerId: null, // no usamos su id para no chocar con el namespace de api-football
    matchAt: parseMatchAt(g.local_date),
    kickoffAtUtc: null, // local sin offset → no pisamos el horario (ya correcto)
    status,
    homeName: g.home_team_name_en ?? "", // eliminatorias sin definir vienen sin nombre
    awayName: g.away_team_name_en ?? "",
    goals: { home, away },
    ft: { home, away },
    homeWinner: null, // no expone ganador → advancer de empates va a mano
    awayWinner: null,
    liveMinute: liveMinuteOf(g, status),
  };
}

export const worldcup26irProvider: ScoreProvider = {
  name: "worldcup26ir",
  async fetchFixtures(): Promise<ProviderFixture[]> {
    const token = process.env.WORLDCUP26_TOKEN;
    const res = await fetch(`${BASE}/get/games`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`worldcup26.ir respondió ${res.status}`);
    const json = (await res.json()) as { games?: RawGame[] };
    return (json.games ?? []).map(toFixture);
  },
};
