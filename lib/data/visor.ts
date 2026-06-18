import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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
  /** Monto de inscripción de la fecha (soles). Pozo = inscritos × esto. */
  entry_fee: number;
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
  liveMinute: string | null;
  home: VisorTeam;
  away: VisorTeam;
}

export interface TeamRow {
  id: number;
  code: string | null;
  country_code: string | null;
  name: string | null;
}

function side(team: TeamRow | undefined, label: string | null): VisorTeam {
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

/**
 * Equipos del Mundial: cuasi-estáticos (no cambian durante el torneo).
 * Caché remoto con tag "teams" (revalidate 1h) + memo por request con cache().
 * OJO: no toca cookies/sesión — apto para unstable_cache.
 */
export const getTeams = cache(
  unstable_cache(
    async (): Promise<TeamRow[]> => {
      const db = createAdminClient();
      const { data, error } = await db
        .from("teams")
        .select("id, code, country_code, name");
      if (error) throw new Error(`getTeams: ${error.message}`);
      return (data ?? []) as TeamRow[];
    },
    ["teams"],
    { tags: ["teams"], revalidate: 3600 },
  ),
);

/**
 * Todas las rondas, ordenadas (las "fechas" que abre el admin).
 * Cambian solo cuando el admin abre/cierra/configura fechas → caché remoto con
 * tag "rounds" (revalidate 300s; las server actions del admin hacen updateTag).
 * cache() además dedupea las llamadas repetidas dentro de un mismo request.
 */
export const getRounds = cache(
  unstable_cache(
    async (): Promise<RoundRow[]> => {
      const db = createAdminClient();
      const { data, error } = await db
        .from("rounds")
        .select("id, key, label, sort_order, is_open, lock_mode, entry_fee")
        .order("sort_order");
      if (error) throw new Error(`getRounds: ${error.message}`);
      return (data ?? []) as RoundRow[];
    },
    ["rounds"],
    { tags: ["rounds"], revalidate: 300 },
  ),
);

/**
 * Fecha "frontera" = la primera (por sort_order) con algún partido SIN terminar.
 * Es la fecha "actual" del torneo y auto-avanza al cerrarse cada una (Fecha 1
 * terminada → Fecha 2 → … → Final). Si todas terminaron, devuelve la última.
 * Es el default para el visor y el ranking (no reordena: solo marca la activa).
 */
export const getCurrentRound = cache(async (): Promise<RoundRow | null> => {
  const rounds = await getRounds();
  if (rounds.length === 0) return null;
  const db = createAdminClient();
  const { data } = await db.from("matches").select("round_id").neq("status", "finished");
  const pending = new Set<number>((data ?? []).map((m) => m.round_id as number));
  return rounds.find((r) => pending.has(r.id)) ?? rounds[rounds.length - 1];
});

/** Partidos de una ronda, con equipos resueltos (join en JS, a prueba de balas). */
export const getMatchesForRound = cache(async (roundId: number): Promise<VisorMatch[]> => {
  const db = createAdminClient();
  const [matchesRes, teams] = await Promise.all([
    db
      .from("matches")
      .select(
        "id, group_letter, stage, status, kickoff_at, home_score, away_score, advancer, live_minute, home_team_id, away_team_id, home_label, away_label",
      )
      .eq("round_id", roundId)
      .order("kickoff_at"),
    getTeams(),
  ]);
  if (matchesRes.error) throw new Error(`getMatchesForRound: ${matchesRes.error.message}`);

  const byId = new Map<number, TeamRow>(teams.map((t) => [t.id, t]));

  return (matchesRes.data ?? []).map((m) => ({
    id: m.id,
    groupLetter: m.group_letter,
    stage: m.stage as Stage,
    status: m.status as MatchStatus,
    kickoffAt: m.kickoff_at,
    homeScore: m.home_score,
    awayScore: m.away_score,
    advancer: (m.advancer as "home" | "away" | null) ?? null,
    liveMinute: (m as { live_minute?: string | null }).live_minute ?? null,
    home: side(m.home_team_id ? byId.get(m.home_team_id) : undefined, m.home_label),
    away: side(m.away_team_id ? byId.get(m.away_team_id) : undefined, m.away_label),
  }));
});
