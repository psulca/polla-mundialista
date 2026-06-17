import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Monto de inscripción POR DEFECTO (soles). La fuente de verdad ahora es
 * `rounds.entry_fee` (configurable por fecha desde el admin); esto es solo el
 * default/fallback cuando una ronda no tiene valor.
 */
export const ENTRY_FEE = 10;

/** Cantidad de inscritos por ronda: Map<roundId, count>. */
export async function getEntryCounts(): Promise<Map<number, number>> {
  const db = createAdminClient();
  const { data } = await db.from("round_entries").select("round_id");
  const m = new Map<number, number>();
  for (const r of data ?? [])
    m.set(r.round_id as number, (m.get(r.round_id as number) ?? 0) + 1);
  return m;
}

/** IDs de los jugadores inscritos en una ronda (para el admin de pagos). */
export async function getRoundEntryPlayerIds(
  roundId: number,
): Promise<Set<string>> {
  const db = createAdminClient();
  const { data } = await db
    .from("round_entries")
    .select("player_id")
    .eq("round_id", roundId);
  return new Set((data ?? []).map((r) => r.player_id as string));
}
