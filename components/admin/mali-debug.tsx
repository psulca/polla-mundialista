"use client";

import { useState } from "react";

const MODES = [
  { label: "Normal",          cls: "" },
  { label: "Sin radius",      cls: "dbg-no-radius" },
  { label: "Sin border",      cls: "dbg-no-border" },
  { label: "Sin bg",          cls: "dbg-no-bg" },
  { label: "Sin scroll-area", cls: "dbg-no-sa" },
  { label: "Sin todo",        cls: "dbg-bare" },
] as const;

export function MaliDebug({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState(0);
  const cycle = () => setMode((m) => (m + 1) % MODES.length);

  return (
    <div className={`mt-3 flex min-h-0 flex-1 flex-col gap-2 ${MODES[mode].cls}`}>
      <button
        onClick={cycle}
        className="shrink-0 rounded-full bg-gold px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-black"
      >
        Mali: {MODES[mode].label}
      </button>
      {children}
    </div>
  );
}
