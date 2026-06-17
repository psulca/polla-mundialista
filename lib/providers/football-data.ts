import "server-only";
import type { ProviderFixture, ScoreProvider } from "./types";

/**
 * Adaptador de football-data.org (v4). Reemplazo de worldcup26.ir cuando este se cae.
 *
 * CLAVE (verificado contra la doc v4):
 *  - Auth por header `X-Auth-Token`. La key free se saca registrándose (gratis).
 *  - UN solo request trae los 104 partidos: GET /v4/competitions/WC/matches. Como
 *    devuelve todo el torneo, IGNORA la pista `dates` (igual que worldcup26.ir).
 *  - Free tier: 10 req/min. El cron pide 1/min → de sobra.
 *  - `utcDate` es UTC REAL → lo usamos para corregir el horario en la BD.
 *  - Minuto en vivo: `minute` (número) y `status: PAUSED` = entretiempo → "HT".
 *    (El `minute` puede no venir en el free tier; si falta, liveMinute = null y la
 *    UI cae al "En vivo" — el estado y el marcador igual llegan bien.)
 *  - `score.fullTime` = marcador corriente en vivo Y final. `score.winner`
 *    (HOME_TEAM/AWAY_TEAM) define el advancer en empates de eliminatoria.
 *
 * Para activarlo: SCORE_PROVIDER=football-data (ver lib/providers/index.ts).
 */
const BASE = process.env.FOOTBALL_DATA_BASE ?? "https://api.football-data.org/v4";
const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION ?? "WC";

type RawStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

interface RawMatch {
  id: number;
  utcDate: string;
  status: RawStatus;
  minute?: number | string | null;
  homeTeam: { id: number | null; name: string | null };
  awayTeam: { id: number | null; name: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

/** Estados de football-data → nuestro enum. PAUSED = entretiempo (sigue "live"). */
function mapStatus(s: RawStatus): "scheduled" | "live" | "finished" {
  if (s === "FINISHED" || s === "AWARDED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  return "scheduled"; // SCHEDULED, TIMED, SUSPENDED, POSTPONED, CANCELLED
}

function liveMinuteOf(m: RawMatch): string | null {
  if (m.status === "PAUSED") return "HT";
  if (m.status !== "IN_PLAY") return null;
  const n = parseInt(String(m.minute ?? ""), 10);
  return Number.isFinite(n) ? String(n) : null;
}

function toFixture(m: RawMatch): ProviderFixture {
  const ft = { home: m.score.fullTime.home, away: m.score.fullTime.away };
  return {
    providerId: m.id,
    matchAt: m.utcDate,
    kickoffAtUtc: m.utcDate, // football-data SÍ da UTC real
    status: mapStatus(m.status),
    homeName: m.homeTeam.name ?? "", // eliminatorias sin definir vienen sin nombre
    awayName: m.awayTeam.name ?? "",
    goals: ft, // en vivo, fullTime es el marcador corriente
    ft,
    homeWinner: m.score.winner === "HOME_TEAM" ? true : null,
    awayWinner: m.score.winner === "AWAY_TEAM" ? true : null,
    liveMinute: liveMinuteOf(m),
  };
}

export const footballDataProvider: ScoreProvider = {
  name: "football-data",
  async fetchFixtures(): Promise<ProviderFixture[]> {
    const key = process.env.FOOTBALL_DATA_KEY;
    if (!key) throw new Error("Falta FOOTBALL_DATA_KEY en el entorno.");

    const res = await fetch(`${BASE}/competitions/${COMPETITION}/matches`, {
      headers: { "X-Auth-Token": key },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`football-data.org respondió ${res.status}`);

    const json = (await res.json()) as { matches?: RawMatch[] };
    return (json.matches ?? []).map(toFixture);
  },
};
