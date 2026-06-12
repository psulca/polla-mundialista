"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Cuenta regresiva hacia `target` (ISO). Renderiza un placeholder hasta montar
 * (evita el mismatch de hidratación por la hora server vs cliente).
 */
export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return <span className="tnum text-muted-foreground">··:··:··</span>;

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return <span className="text-magenta">En juego</span>;

  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <span className="tnum text-neon">
      {d > 0 ? `${d}d ` : ""}
      {pad(h)}:{pad(m)}:{pad(sec)}
    </span>
  );
}
