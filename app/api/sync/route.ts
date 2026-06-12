import { NextResponse, type NextRequest } from "next/server";
import { syncMatches } from "@/lib/sync-matches";
import { isAuthorizedCron } from "@/lib/auth/cron";

/**
 * Endpoint que dispara la sincronización con API-Football.
 * Lo llama el cron (Vercel Cron) cada pocos minutos — NUNCA las páginas.
 *
 * Seguridad: requiere el header `Authorization: Bearer <CRON_SECRET>` que Vercel
 * inyecta automáticamente en los crons. Sin CRON_SECRET, queda cerrado.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const result = await syncMatches();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
