import { NextResponse, type NextRequest } from "next/server";
import { syncMatches } from "@/lib/sync-matches";
import { isAuthorizedCron } from "@/lib/auth/cron";

/**
 * Endpoint que dispara la sincronización de marcadores con el proveedor activo.
 * Lo llama el cron (Supabase pg_cron) cada minuto — NUNCA las páginas. El gate
 * interno hace que un minuto sin partido sea baratísimo (1 query, sin llamada).
 *
 * Seguridad: requiere el header `Authorization: Bearer <CRON_SECRET>`. Sin
 * CRON_SECRET, queda cerrado (fail-closed).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const result = await syncMatches();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
