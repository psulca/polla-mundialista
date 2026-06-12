import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LeaderRow {
  playerId: string;
  displayName: string;
  totalPoints: number;
  exactCount: number;
  resultCount: number;
}

export type RankTab = "general" | "exactos" | "resultados";

const SORTERS: Record<RankTab, (a: LeaderRow, b: LeaderRow) => number> = {
  // El localeCompare final hace el orden DETERMINISTA cuando todo lo demás empata
  // (si no, el orden de los empatados cambia entre cargas).
  general: (a, b) =>
    b.totalPoints - a.totalPoints ||
    b.exactCount - a.exactCount ||
    b.resultCount - a.resultCount ||
    a.displayName.localeCompare(b.displayName),
  exactos: (a, b) =>
    b.exactCount - a.exactCount ||
    b.totalPoints - a.totalPoints ||
    a.displayName.localeCompare(b.displayName),
  resultados: (a, b) =>
    b.resultCount - a.resultCount ||
    b.totalPoints - a.totalPoints ||
    a.displayName.localeCompare(b.displayName),
};

interface RawLeader {
  player_id: string;
  display_name: string;
  total_points: number;
  exact_count: number;
  result_count: number;
}

function toRows(data: RawLeader[] | null, tab: RankTab): LeaderRow[] {
  return (data ?? [])
    .map((r) => ({
      playerId: r.player_id,
      displayName: r.display_name,
      totalPoints: r.total_points,
      exactCount: r.exact_count,
      resultCount: r.result_count,
    }))
    .sort(SORTERS[tab]);
}

/** Ranking GENERAL acumulado (todas las fechas en las que se inscribió el jugador). */
export async function getLeaderboard(tab: RankTab): Promise<LeaderRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("leaderboard")
    .select("player_id, display_name, total_points, exact_count, result_count");
  if (error) throw new Error(`getLeaderboard: ${error.message}`);
  return toRows(data as RawLeader[] | null, tab);
}

/** Ranking de UNA fecha: solo jugadores inscritos en esa ronda. */
export async function getRoundLeaderboard(
  roundId: number,
  tab: RankTab,
): Promise<LeaderRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("round_leaderboard")
    .select("player_id, display_name, total_points, exact_count, result_count")
    .eq("round_id", roundId);
  if (error) throw new Error(`getRoundLeaderboard: ${error.message}`);
  return toRows(data as RawLeader[] | null, tab);
}
