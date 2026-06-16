import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRounds, getTeams, type RoundRow, type TeamRow } from "./visor";
import { getLeaderboard, type LeaderRow } from "./ranking";
import type { MatchStatus } from "@/lib/types";

export interface HomeMatch {
  id: number;
  home: { code: string; flag: string };
  away: { code: string; flag: string };
  kickoffAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  liveMinute: string | null;
}

export interface HomeData {
  openRound: RoundRow | null;
  deadlineAt: string | null;
  total: number;
  filled: number;
  top: LeaderRow[];
  live: HomeMatch[];
  next: HomeMatch | null;
  playerCount: number;
}

export async function getHomeData(playerId: string | null): Promise<HomeData> {
  const db = createAdminClient();
  const rounds = await getRounds();
  const openRound = rounds.find((r) => r.is_open) ?? null;

  const [matchesRes, teams, entriesRes, top, predsRes] = await Promise.all([
    db
      .from("matches")
      .select(
        "id, home_team_id, away_team_id, home_label, away_label, kickoff_at, status, home_score, away_score, live_minute, round_id",
      )
      .order("kickoff_at"),
    getTeams(),
    // Pozo de la fecha activa = inscritos en esa ronda.
    openRound
      ? db
          .from("round_entries")
          .select("round_id", { count: "exact", head: true })
          .eq("round_id", openRound.id)
      : Promise.resolve({ count: 0 }),
    getLeaderboard("general"),
    // Predicciones del jugador (solo match_id, ≤104 filas): va EN PARALELO acá
    // en vez de como query secuencial después — el filtro por ronda se hace en JS.
    playerId
      ? db.from("predictions").select("match_id").eq("player_id", playerId)
      : Promise.resolve({ data: null }),
  ]);

  const all = matchesRes.data ?? [];
  const tmap = new Map<number, TeamRow>(teams.map((t) => [t.id, t]));
  const side = (id: number | null, label: string | null) => {
    const t = id ? tmap.get(id) : null;
    return t
      ? { code: t.code ?? "???", flag: t.country_code ?? "" }
      : { code: label ?? "—", flag: "" };
  };
  type Row = (typeof all)[number];
  const toHM = (m: Row): HomeMatch => ({
    id: m.id,
    home: side(m.home_team_id, m.home_label),
    away: side(m.away_team_id, m.away_label),
    kickoffAt: m.kickoff_at,
    status: m.status as MatchStatus,
    homeScore: m.home_score,
    awayScore: m.away_score,
    liveMinute: (m as { live_minute?: string | null }).live_minute ?? null,
  });

  const nowMs = Date.now();
  const live = all
    .filter((m) => {
      const k = new Date(m.kickoff_at).getTime();
      return (
        m.status === "live" ||
        (m.status !== "finished" && nowMs >= k && nowMs < k + 2 * 3_600_000)
      );
    })
    .map(toHM);
  const nextRaw = all.find(
    (m) => m.status !== "finished" && new Date(m.kickoff_at).getTime() > nowMs,
  );
  const next = nextRaw ? toHM(nextRaw) : null;

  let deadlineAt: string | null = null;
  let total = 0;
  let filled = 0;
  if (openRound) {
    const roundMatches = all.filter((m) => m.round_id === openRound.id);
    total = roundMatches.length;
    deadlineAt = roundMatches.reduce<string | null>(
      (min, m) => (!min || m.kickoff_at < min ? m.kickoff_at : min),
      null,
    );
    if (playerId && roundMatches.length) {
      const roundIds = new Set(roundMatches.map((m) => m.id));
      filled = (predsRes.data ?? []).filter((p) => roundIds.has(p.match_id)).length;
    }
  }

  return {
    openRound,
    deadlineAt,
    total,
    filled,
    top: top.slice(0, 3),
    live,
    next,
    playerCount: entriesRes.count ?? 0,
  };
}
