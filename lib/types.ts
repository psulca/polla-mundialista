/**
 * Tipos del dominio (espejo del esquema en supabase/migrations/0001_init.sql).
 * Cuando conectes la base, puedes reemplazarlos por los tipos generados con
 * `supabase gen types typescript`.
 */
import type { LockMode } from "./domain/locking";
import type { HitKind } from "./domain/scoring";

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";
export type MatchStatus = "scheduled" | "live" | "finished";
export type ScoreSource = "api" | "manual";
export type PlayerStatus = "pending" | "approved";

export interface Team {
  id: number;
  name: string;
  code: string | null;
  flagEmoji: string | null;
  groupLetter: string | null;
}

export interface Round {
  id: number;
  key: string;
  label: string;
  sortOrder: number;
  isOpen: boolean;
}

export interface Match {
  id: number;
  roundId: number | null;
  stage: Stage;
  matchday: number | null;
  groupLetter: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeLabel: string | null;
  awayLabel: string | null;
  kickoffAt: string; // ISO
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  source: ScoreSource;
}

export interface Player {
  id: string; // uuid
  displayName: string;
  status: PlayerStatus;
  isAdmin: boolean;
}

export interface Prediction {
  id: number;
  playerId: string;
  matchId: number;
  predHome: number;
  predAway: number;
}

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalPoints: number;
  exactCount: number;
  resultCount: number;
}

export interface PredictionResult extends Prediction {
  points: number | null;
  hitKind: HitKind | null;
}

export interface Settings {
  lockMode: LockMode;
}
