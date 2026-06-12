"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente anon para el navegador. Único uso: suscripción Realtime a `matches`
 * (marcadores públicos) en el visor. Por RLS, este cliente NO puede leer
 * players ni predictions — eso siempre va por el servidor.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
