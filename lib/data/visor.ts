import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus, Stage } from "@/lib/types";
import type { LockMode } from "@/lib/domain/locking";

export interface RoundRow {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  is_open: boolean;
  lock_mode: LockMode;
}

export interface VisorTeam {
  code: string;
  flag: string;
  name: string;
}

export interface VisorMatch {
  id: number;
  groupLetter: string | null;
  stage: Stage;
  status: MatchStatus;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
  advancer: "home" | "away" | null;
  home: VisorTeam;
  away: VisorTeam;
}

interface TeamLite {
  id: number;
  code: string | null;
  country_code: string | null;
  name: string | null;
}

function side(team: TeamLite | undefined, label: string | null): VisorTeam {
  if (team)
    return {
      code: team.code ?? "???",
      flag: team.country_code ?? "",
      name: team.name ?? team.code ?? "",
    };
  return { code: label ?? "—", flag: "", name: label ?? "" };
}

/** Predicciones del jugador, mapeadas por match_id. */
export async function getPlayerPredictions(
  playerId: string,
): Promise<Map<number, { home: number; away: number }>> {
  const db = createAdminClient();
  const { data } = await db
    .from("predictions")
    .select("match_id, pred_home, pred_away")
    .eq("player_id", playerId);
  return new Map(
    (data ?? []).map((p) => [p.match_id, { home: p.pred_home, away: p.pred_away }]),
  );
}

/** Todas las rondas, ordenadas (las "fechas" que abre el admin). */
export async function getRounds(): Promise<RoundRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("rounds")
    .select("id, key, label, sort_order, is_open, lock_mode")
    .order("sort_order");
  if (error) throw new Error(`getRounds: ${error.message}`);
  return (data ?? []) as RoundRow[];
}

/** Partidos de una ronda, con equipos resueltos (join en JS, a prueba de balas). */
export async function getMatchesForRound(roundId: number): Promise<VisorMatch[]> {
  const db = createAdminClient();
  const [matchesRes, teamsRes] = await Promise.all([
    db
      .from("matches")
      .select(
        "id, group_letter, stage, status, kickoff_at, home_score, away_score, advancer, home_team_id, away_team_id, home_label, away_label",
      )
      .eq("round_id", roundId)
      .order("kickoff_at"),
    db.from("teams").select("id, code, country_code, name"),
  ]);
  if (matchesRes.error) throw new Error(`getMatchesForRound: ${matchesRes.error.message}`);
  if (teamsRes.error) throw new Error(`getTeams: ${teamsRes.error.message}`);

  const byId = new Map<number, TeamLite>((teamsRes.data ?? []).map((t) => [t.id, t]));

  return (matchesRes.data ?? []).map((m) => ({
    id: m.id,
    groupLetter: m.group_letter,
    stage: m.stage as Stage,
    status: m.status as MatchStatus,
    kickoffAt: m.kickoff_at,
    homeScore: m.home_score,
    awayScore: m.away_score,
    advancer: (m.advancer as "home" | "away" | null) ?? null,
    home: side(m.home_team_id ? byId.get(m.home_team_id) : undefined, m.home_label),
    away: side(m.away_team_id ? byId.get(m.away_team_id) : undefined, m.away_label),
  }));
}
