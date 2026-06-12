import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Política suave: el que se equivoca de verdad casi nunca llega a 5;
// el que brutea se choca la pared enseguida.
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min para acumular fallos
const LOCK_MS = 10 * 60 * 1000; // bloqueo de 10 min al pasarse

export interface ThrottleState {
  locked: boolean;
  minutesLeft: number;
}

/** ¿El número está bloqueado ahora mismo? */
export async function checkLoginLock(phone: string): Promise<ThrottleState> {
  const db = createAdminClient();
  const { data } = await db
    .from("login_attempts")
    .select("locked_until")
    .eq("phone", phone)
    .maybeSingle();

  if (data?.locked_until) {
    const until = new Date(data.locked_until).getTime();
    const now = Date.now();
    if (until > now) return { locked: true, minutesLeft: Math.ceil((until - now) / 60000) };
  }
  return { locked: false, minutesLeft: 0 };
}

/** Registra un PIN fallido y devuelve si el número quedó bloqueado. */
export async function recordFailedLogin(phone: string): Promise<ThrottleState> {
  const db = createAdminClient();
  const now = Date.now();

  const { data } = await db
    .from("login_attempts")
    .select("fail_count, first_failed_at")
    .eq("phone", phone)
    .maybeSingle();

  let failCount = 1;
  let firstFailedAt = new Date(now).toISOString();
  // Si el último fallo fue dentro de la ventana, acumulo; si no, reinicio el conteo.
  if (data?.first_failed_at && now - new Date(data.first_failed_at).getTime() < WINDOW_MS) {
    failCount = (data.fail_count ?? 0) + 1;
    firstFailedAt = data.first_failed_at;
  }

  const locked = failCount >= MAX_FAILS;
  const lockedUntil = locked ? new Date(now + LOCK_MS).toISOString() : null;

  await db.from("login_attempts").upsert(
    { phone, fail_count: failCount, first_failed_at: firstFailedAt, locked_until: lockedUntil },
    { onConflict: "phone" },
  );

  return { locked, minutesLeft: locked ? Math.ceil(LOCK_MS / 60000) : 0 };
}

/** Login exitoso → limpia el historial de fallos del número. */
export async function clearLoginAttempts(phone: string): Promise<void> {
  await createAdminClient().from("login_attempts").delete().eq("phone", phone);
}
