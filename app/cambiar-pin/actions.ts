"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentPlayer } from "@/lib/auth/current-player";
import { hashPin, verifyPin } from "@/lib/auth/pin";

const schema = z.object({
  current: z.string().regex(/^\d{6}$/),
  next: z.string().regex(/^\d{6}$/),
});

export type ChangePinState = { error?: string; ok?: boolean } | undefined;

export async function changePin(
  _prev: ChangePinState,
  formData: FormData,
): Promise<ChangePinState> {
  const parsed = schema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
  });
  if (!parsed.success) return { error: "Ambos PIN deben ser de 6 dígitos" };

  const player = await getCurrentPlayer();
  if (!player) return { error: "Inicia sesión" };

  const db = createAdminClient();
  const { data } = await db
    .from("players")
    .select("pin_hash")
    .eq("id", player.id)
    .maybeSingle();
  if (!data) return { error: "Jugador no encontrado" };

  if (!(await verifyPin(parsed.data.current, data.pin_hash))) {
    return { error: "El PIN actual es incorrecto" };
  }

  const pin_hash = await hashPin(parsed.data.next);
  const { error } = await db.from("players").update({ pin_hash }).eq("id", player.id);
  if (error) return { error: error.message };

  return { ok: true };
}
