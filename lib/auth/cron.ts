import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Autoriza una llamada a un endpoint de cron.
 *
 * El scheduler (GitHub Actions en .github/workflows/cron.yml, o Vercel Cron en Pro)
 * manda el header `Authorization: Bearer <CRON_SECRET>`. A diferencia del user-agent,
 * ese header NO se puede falsificar desde afuera sin conocer el secreto.
 *
 * Fail-closed: si CRON_SECRET no está configurado, NADIE entra (devuelve false).
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // sin secret → cerrado, no abierto

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  // Comparación de tiempo constante para no filtrar el secret por timing.
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
