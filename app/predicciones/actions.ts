"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { isLocked, type LockMode } from "@/lib/domain/locking";

const schema = z.object({
  matchId: z.number().int().positive(),
  home: z.number().int().min(0).max(99),
  away: z.number().int().min(0).max(99),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Guarda/actualiza la predicción del jugador para un partido.
 * TODA la autorización y el cierre se validan acá, con la hora del servidor.
 */
export async function savePrediction(input: unknown): Promise<SaveResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { matchId, home, away } = parsed.data;

  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "Inicia sesión" };
  if (player.status !== "approved") return { ok: false, error: "Tu acceso está pendiente de aprobación" };

  const db = createAdminClient();

  const { data: match } = await db
    .from("matches")
    .select("id, kickoff_at, round_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { ok: false, error: "Partido inexistente" };

  const { data: round } = await db
    .from("rounds")
    .select("is_open, lock_mode")
    .eq("id", match.round_id)
    .maybeSingle();
  if (!round?.is_open) return { ok: false, error: "La fecha está cerrada" };

  const lockMode = (round.lock_mode ?? "per_match") as LockMode;

  const { data: firstMatch } = await db
    .from("matches")
    .select("kickoff_at")
    .eq("round_id", match.round_id)
    .order("kickoff_at")
    .limit(1)
    .maybeSingle();
  const firstKickoff = firstMatch?.kickoff_at ?? match.kickoff_at;

  const locked = isLocked(
    { kickoffAt: new Date(match.kickoff_at), roundFirstKickoffAt: new Date(firstKickoff) },
    lockMode,
    new Date(),
  );
  if (locked) return { ok: false, error: "Predicción cerrada (el partido ya empezó)" };

  const { error } = await db.from("predictions").upsert(
    {
      player_id: player.id,
      match_id: matchId,
      pred_home: home,
      pred_away: away,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "player_id,match_id" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

const bulkSchema = z
  .array(
    z.object({
      matchId: z.number().int().positive(),
      home: z.number().int().min(0).max(99),
      away: z.number().int().min(0).max(99),
    }),
  )
  .max(200);

export type BulkResult = { ok: true; saved: number } | { ok: false; error: string };

/** Guarda todos los pronósticos de una fecha de una. Ignora los bloqueados. */
export async function savePredictions(input: unknown): Promise<BulkResult> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const player = await getCurrentPlayer();
  if (!player) return { ok: false, error: "Inicia sesión" };
  if (player.status !== "approved") return { ok: false, error: "Tu acceso está pendiente" };
  if (parsed.data.length === 0) return { ok: true, saved: 0 };

  const db = createAdminClient();
  const ids = parsed.data.map((x) => x.matchId);

  const { data: ms } = await db.from("matches").select("id, kickoff_at, round_id").in("id", ids);
  const mById = new Map((ms ?? []).map((m) => [m.id, m]));

  const roundIds = [...new Set((ms ?? []).map((m) => m.round_id))];
  const [{ data: rounds }, { data: roundMatches }] = await Promise.all([
    db.from("rounds").select("id, is_open, lock_mode").in("id", roundIds),
    db.from("matches").select("round_id, kickoff_at").in("round_id", roundIds),
  ]);
  const roundOpen = new Map((rounds ?? []).map((r) => [r.id, r.is_open]));
  const roundMode = new Map((rounds ?? []).map((r) => [r.id, (r.lock_mode ?? "per_match") as LockMode]));
  const firstKick = new Map<number, string>();
  for (const rm of roundMatches ?? []) {
    const cur = firstKick.get(rm.round_id);
    if (!cur || rm.kickoff_at < cur) firstKick.set(rm.round_id, rm.kickoff_at);
  }

  const now = new Date();
  const toUpsert = parsed.data
    .map((p) => ({ p, m: mById.get(p.matchId) }))
    .filter(({ m }) => m && roundOpen.get(m.round_id))
    .filter(
      ({ m }) =>
        !isLocked(
          {
            kickoffAt: new Date(m!.kickoff_at),
            roundFirstKickoffAt: new Date(firstKick.get(m!.round_id) ?? m!.kickoff_at),
          },
          roundMode.get(m!.round_id) ?? "per_match",
          now,
        ),
    )
    .map(({ p }) => ({
      player_id: player.id,
      match_id: p.matchId,
      pred_home: p.home,
      pred_away: p.away,
      updated_at: now.toISOString(),
    }));

  if (toUpsert.length) {
    const { error } = await db
      .from("predictions")
      .upsert(toUpsert, { onConflict: "player_id,match_id" });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/predicciones");
  return { ok: true, saved: toUpsert.length };
}

