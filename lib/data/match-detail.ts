import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MatchStatus } from "@/lib/types";
import { classify, scorePrediction, type HitKind } from "@/lib/domain/scoring";

export interface DetailTeam {
  code: string;
  flag: string;
}

export interface DetailRow {
  playerId: string;
  name: string;
  voted: boolean;
  pred: { home: number; away: number } | null;
  points: number | null;
  kind: HitKind | null;
  isMe: boolean;
}

export interface MatchDetail {
  id: number;
  home: DetailTeam;
  away: DetailTeam;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  kickoffAt: string;
  roundLabel: string;
  groupLetter: string | null;
  revealed: boolean;
  finished: boolean;
  votedCount: number;
  approvedCount: number;
  myPrediction: { home: number; away: number } | null;
  rows: DetailRow[];
}

interface TeamLite {
  id: number;
  code: string | null;
  country_code: string | null;
}

export async function getMatchDetail(
  matchId: number,
  currentPlayerId: string | null,
): Promise<MatchDetail | null> {
  const db = createAdminClient();
  const { data: m } = await db
    .from("matches")
    .select(
      "id, home_team_id, away_team_id, home_label, away_label, home_score, away_score, status, kickoff_at, group_letter, round_id",
    )
    .eq("id", matchId)
    .maybeSingle();
  if (!m) return null;

  const [teamsRes, roundRes, approvedRes, predsRes] = await Promise.all([
    db.from("teams").select("id, code, country_code"),
    db.from("rounds").select("label").eq("id", m.round_id).maybeSingle(),
    db.from("players").select("id, display_name").eq("status", "approved").order("display_name"),
    db.from("predictions").select("player_id, pred_home, pred_away").eq("match_id", matchId),
  ]);

  const tmap = new Map<number, TeamLite>((teamsRes.data ?? []).map((t) => [t.id, t]));
  function side(id: number | null, label: string | null): DetailTeam {
    const t = id ? tmap.get(id) : null;
    return t ? { code: t.code ?? "???", flag: t.country_code ?? "" } : { code: label ?? "—", flag: "" };
  }

  const finished = m.status === "finished" && m.home_score != null && m.away_score != null;
  const revealed = Date.now() >= new Date(m.kickoff_at).getTime();
  const predMap = new Map(
    (predsRes.data ?? []).map((p) => [p.player_id as string, { home: p.pred_home, away: p.pred_away }]),
  );
  const approvedList = approvedRes.data ?? [];

  const rows: DetailRow[] = approvedList.map((pl) => {
    const voted = predMap.has(pl.id);
    const pred = revealed && voted ? predMap.get(pl.id)! : null;
    let points: number | null = null;
    let kind: HitKind | null = null;
    if (finished && pred) {
      const actual = { home: m.home_score!, away: m.away_score! };
      points = scorePrediction(pred, actual);
      kind = classify(pred, actual);
    }
    return {
      playerId: pl.id,
      name: pl.display_name,
      voted,
      pred,
      points,
      kind,
      isMe: pl.id === currentPlayerId,
    };
  });

  rows.sort((a, b) => {
    if (finished) return (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name);
    if (a.voted !== b.voted) return a.voted ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    id: m.id,
    home: side(m.home_team_id, m.home_label),
    away: side(m.away_team_id, m.away_label),
    homeScore: m.home_score,
    awayScore: m.away_score,
    status: m.status as MatchStatus,
    kickoffAt: m.kickoff_at,
    roundLabel: roundRes.data?.label ?? "",
    groupLetter: m.group_letter,
    revealed,
    finished,
    votedCount: predMap.size,
    approvedCount: approvedList.length,
    myPrediction: currentPlayerId ? predMap.get(currentPlayerId) ?? null : null,
    rows,
  };
}
