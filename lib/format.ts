/**
 * Formato de fechas/horas SIEMPRE en hora de Perú (America/Lima, UTC-5 sin DST).
 * Los kickoffs se guardan en UTC; acá se muestran en la hora local del usuario peruano.
 */
const LIMA = "America/Lima";

/** "11 jun, 19:00" — fecha corta + hora, en horario de Perú. */
export function fmtKickoff(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LIMA,
  }).format(new Date(iso));
}

/** Solo la hora "19:00" en horario de Perú. */
export function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LIMA,
  }).format(new Date(iso));
}

/** Número peruano "987654321" → "987 654 321" para que se lea más fácil. */
export function fmtPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  return d.length === 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d;
}
