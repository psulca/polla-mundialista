"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlayer } from "@/lib/auth/current-player";

async function assertAdmin() {
  const p = await getCurrentPlayer();
  if (!p?.isAdmin) throw new Error("No autorizado");
}

/** Corta con un error visible si Supabase devolvió error (en vez de fallar en silencio). */
function assertOk(error: { message: string } | null, contexto: string) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

/** Refresca todas las vistas que dependen de estos datos. */
function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/visor");
  revalidatePath("/ranking");
  revalidatePath("/predicciones");
  revalidatePath("/admin");
}

export async function approvePlayer(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("playerId"));
  const { error } = await createAdminClient()
    .from("players")
    .update({ status: "approved" })
    .eq("id", id);
  assertOk(error, "Aprobar jugador");
  revalidateAll();
}

export async function rejectPlayer(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("playerId"));
  const { error } = await createAdminClient().from("players").delete().eq("id", id);
  assertOk(error, "Rechazar jugador");
  revalidateAll();
}

export async function toggleRound(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("roundId"));
  const open = formData.get("open") === "true";
  const { error } = await createAdminClient()
    .from("rounds")
    .update({ is_open: open })
    .eq("id", id);
  assertOk(error, "Abrir/cerrar fecha");
  // Expira el caché remoto de getRounds() YA (read-your-writes): el admin ve
  // el cambio al instante y los jugadores no quedan con una fecha vieja.
  updateTag("rounds");
  revalidateAll();
}

export async function setRoundLockMode(formData: FormData) {
  await assertAdmin();
  const roundId = Number(formData.get("roundId"));
  const mode = String(formData.get("mode"));
  if (mode !== "per_match" && mode !== "per_matchday") return;
  const db = createAdminClient();
  // No se puede cambiar el modo de una fecha que ya está abierta (sería injusto).
  const { data: round } = await db.from("rounds").select("is_open").eq("id", roundId).maybeSingle();
  if (round?.is_open) return;
  const { error } = await db.from("rounds").update({ lock_mode: mode }).eq("id", roundId);
  assertOk(error, "Cambiar modo de cierre");
  updateTag("rounds"); // getRounds() cachea lock_mode → expirar ya.
  revalidateAll();
}

/** Marca/desmarca que un jugador pagó (se inscribió) en una fecha. */
export async function toggleEntry(formData: FormData) {
  await assertAdmin();
  const roundId = Number(formData.get("roundId"));
  const playerId = String(formData.get("playerId"));
  const on = formData.get("on") === "true";
  const db = createAdminClient();
  if (on) {
    // Inscribir = que exista la fila. ignoreDuplicates → INSERT ON CONFLICT DO NOTHING
    // (solo necesita permiso INSERT; DO UPDATE pediría UPDATE, que no tiene).
    const { error } = await db
      .from("round_entries")
      .upsert(
        { round_id: roundId, player_id: playerId },
        { onConflict: "round_id,player_id", ignoreDuplicates: true },
      );
    assertOk(error, "Marcar pago");
  } else {
    const { error } = await db
      .from("round_entries")
      .delete()
      .eq("round_id", roundId)
      .eq("player_id", playerId);
    assertOk(error, "Quitar pago");
  }
  revalidateAll();
}

export async function setKnockoutBonus(formData: FormData) {
  await assertAdmin();
  const on = formData.get("on") === "true";
  const db = createAdminClient();
  // No se puede cambiar el puntaje de eliminatorias una vez que arrancaron.
  const { count } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .neq("stage", "group")
    .lte("kickoff_at", new Date().toISOString());
  if (count && count > 0) return;
  const { error } = await db.from("settings").update({ knockout_bonus: on }).eq("id", 1);
  assertOk(error, "Cambiar bono de eliminatorias");
  revalidateAll();
}

export async function setScore(formData: FormData) {
  await assertAdmin();
  const matchId = Number(formData.get("matchId"));
  const home = formData.get("home");
  const away = formData.get("away");
  if (home === "" || away === "" || home == null || away == null) return;

  const homeScore = Number(home);
  const awayScore = Number(away);
  const adv = String(formData.get("advancer") ?? "");
  const advancer = adv === "home" || adv === "away" ? adv : null;

  const db = createAdminClient();

  // Guard: si es un empate de ELIMINATORIA y el bono está activo, hay que decir
  // quién avanza — si no, los que acertaron al clasificado se quedan sin puntos.
  if (homeScore === awayScore && !advancer) {
    const { data: m } = await db.from("matches").select("stage").eq("id", matchId).maybeSingle();
    if (m?.stage && m.stage !== "group") {
      const { data: s } = await db
        .from("settings")
        .select("knockout_bonus")
        .eq("id", 1)
        .maybeSingle();
      if (s?.knockout_bonus) {
        throw new Error("Es un empate de eliminatoria: marca quién avanza antes de guardar.");
      }
    }
  }

  const { error } = await db
    .from("matches")
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: "finished",
      source: "manual",
      advancer,
    })
    .eq("id", matchId);
  assertOk(error, "Guardar marcador");
  revalidateAll();
}

/** Resetea el partido: borra el marcador manual para que la API vuelva a mandar. */
export async function resetScore(formData: FormData) {
  await assertAdmin();
  const matchId = Number(formData.get("matchId"));
  const { error } = await createAdminClient()
    .from("matches")
    .update({ home_score: null, away_score: null, status: "scheduled", source: "api" })
    .eq("id", matchId);
  assertOk(error, "Borrar marcador");
  revalidateAll();
}
