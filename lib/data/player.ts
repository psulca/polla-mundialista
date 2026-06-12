import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRounds, getTeams, type TeamRow } from "./visor";
import { classify, type HitKind } from "@/lib/domain/scoring";
import type { MatchStatus } from "@/lib/types";

export interface PlayerPredRow {
  matchId: number;
  roundLabel: string;
  kickoffAt: string;
  status: MatchStatus;
  home: { code: string; flag: string };
  away: { code: string; flag: string };
  homeScore: number | null;
  awayScore: number | null;
  pred: { home: number; away: number };
  hitKind: HitKind | null;
}

export interface PlayerProfile {
  name: string;
  rows: PlayerPredRow[];
}

/**
 * Perfil público de un jugador: sus pronósticos, SOLO de partidos ya empezados.
 * La restricción del kickoff es clave: no se pueden espiar picks de partidos que
 * todavía no arrancaron. (Mismo criterio de revelado del visor.)
 */
export async function getPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const db = createAdminClient();
  // player, predicciones, teams y rounds NO dependen entre sí → todo en paralelo.
  // (teams y rounds además vienen del caché remoto compartido.)
  const [playerRes, predsRes, teams, rounds] = await Promise.all([
    db.from("players").select("display_name").eq("id", playerId).maybeSingle(),
    db
      .from("predictions")
      .select("match_id, pred_home, pred_away")
      .eq("player_id", playerId),
    getTeams(),
    getRounds(),
  ]);
  const player = playerRes.data;
  if (!player) return null;

  const preds = predsRes.data;
  if (!preds || preds.length === 0) return { name: player.display_name, rows: [] };

  const nowIso = new Date().toISOString();
  const ids = preds.map((p) => p.match_id);
  // Única query dependiente: necesita los match_id de las predicciones.
  const { data: matches } = await db
    .from("matches")
    .select(
      "id, round_id, kickoff_at, status, home_score, away_score, home_team_id, away_team_id, home_label, away_label",
    )
    .in("id", ids)
    .lte("kickoff_at", nowIso) // ← solo partidos ya empezados (revelados)
    .order("kickoff_at", { ascending: false });

  const tmap = new Map<number, TeamRow>(teams.map((t) => [t.id, t]));
  const roundLabel = new Map<number, string>(rounds.map((r) => [r.id, r.label]));
  const predByMatch = new Map(preds.map((p) => [p.match_id, p]));
  const side = (id: number | null, label: string | null) => {
    const t = id ? tmap.get(id) : null;
    return t ? { code: t.code ?? "???", flag: t.country_code ?? "" } : { code: label ?? "—", flag: "" };
  };

  const rows: PlayerPredRow[] = (matches ?? []).map((m) => {
    const p = predByMatch.get(m.id)!;
    const finished = m.status === "finished" && m.home_score != null && m.away_score != null;
    return {
      matchId: m.id,
      roundLabel: roundLabel.get(m.round_id) ?? "",
      kickoffAt: m.kickoff_at,
      status: m.status as MatchStatus,
      home: side(m.home_team_id, m.home_label),
      away: side(m.away_team_id, m.away_label),
      homeScore: m.home_score,
      awayScore: m.away_score,
      pred: { home: p.pred_home, away: p.pred_away },
      hitKind: finished
        ? classify({ home: p.pred_home, away: p.pred_away }, { home: m.home_score!, away: m.away_score! })
        : null,
    };
  });

  return { name: player.display_name, rows };
}
