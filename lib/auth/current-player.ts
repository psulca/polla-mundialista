import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Player } from "@/lib/types";

function toPlayer(row: {
  id: string;
  display_name: string;
  status: string;
  is_admin: boolean;
}): Player {
  return {
    id: row.id,
    displayName: row.display_name,
    status: row.status as Player["status"],
    isAdmin: row.is_admin,
  };
}

/**
 * DAL — jugador de la sesión actual (o null). Memoizado por render con cache().
 * Es la fuente de verdad de autorización del lado del servidor.
 */
export const getCurrentPlayer = cache(async (): Promise<Player | null> => {
  const session = await getSession();
  if (!session) return null;
  const { data } = await createAdminClient()
    .from("players")
    .select("id, display_name, status, is_admin")
    .eq("id", session.playerId)
    .maybeSingle();
  return data ? toPlayer(data) : null;
});

/** Exige sesión válida; si no, manda a /login. */
export const requireAuth = cache(async (): Promise<Player> => {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login");
  return player;
});

/** Exige jugador aprobado; pendiente → al inicio (que muestra el aviso). */
export async function requireApproved(): Promise<Player> {
  const player = await requireAuth();
  if (player.status !== "approved") redirect("/");
  return player;
}

/** Exige admin; si no, al inicio. */
export async function requireAdmin(): Promise<Player> {
  const player = await requireAuth();
  if (!player.isAdmin) redirect("/");
  return player;
}
