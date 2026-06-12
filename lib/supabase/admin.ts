import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role. SOLO servidor (Server Actions / Route Handlers / cron).
 * Bypassa RLS: es la única vía para leer/escribir players y predictions.
 * NUNCA importar esto en código de cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
