"use client";

import { useState, useEffect } from "react";

const MODES = [
  { label: "Normal",        cls: "" },
  { label: "Sin radius",    cls: "dbg-no-radius" },
  { label: "Sin border",    cls: "dbg-no-border" },
  { label: "Sin bg",        cls: "dbg-no-bg" },
  { label: "Sin scroll-area", cls: "dbg-no-sa" },
  { label: "Sin todo",      cls: "dbg-bare" },
] as const;

/** Floating debug toggle — only renders when URL contains debug=1 */
export function MaliDebug({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState(0);

  useEffect(() => {
    setActive(window.location.search.includes("debug=1"));
  }, []);

  if (!active) return <>{children}</>;

  const cycle = () => setMode((m) => (m + 1) % MODES.length);

  return (
    <div className={`contents ${MODES[mode].cls}`}>
      {children}
      <button
        onClick={cycle}
        className="fixed bottom-6 right-4 z-50 rounded-full bg-gold px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-black shadow-xl"
      >
        Mali: {MODES[mode].label}
      </button>
    </div>
  );
}
