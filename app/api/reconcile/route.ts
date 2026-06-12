import { NextResponse, type NextRequest } from "next/server";
import { reconcileFixtures } from "@/lib/sync-matches";
import { isAuthorizedCron } from "@/lib/auth/cron";

/**
 * Reconcilia ayer/hoy/mañana con API-Football: corrige horarios, linkea los partidos
 * y carga marcadores. Lo dispara un cron diario (ver vercel.json). 3 llamadas.
 * Protegido igual que /api/sync (header `Authorization: Bearer <CRON_SECRET>`).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const result = await reconcileFixtures();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
