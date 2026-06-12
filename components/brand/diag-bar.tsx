"use client";

import { useState } from "react";

/**
 * Barra de diagnóstico del bug de render (GPU Mali). FLOTANTE abajo, colapsable.
 * Apaga partes del inicio EN VIVO por DOM (sin navegar → no pierde el scroll).
 * El usuario apaga cosas hasta que el glitch desaparece → esa es la causa.
 *
 * Requiere que las secciones del home tengan data-diag="header|live|hero|grid|top3".
 */

type Key =
  | "header"
  | "live"
  | "hero"
  | "grid"
  | "pozo"
  | "proximo"
  | "countdown"
  | "flags"
  | "top3"
  | "shadow"
  | "gradient"
  | "overflow"
  | "flagshadow"
  | "flaground"
  | "bg"
  | "glow";

const SECTIONS: Key[] = [
  "header",
  "live",
  "hero",
  "grid",
  "pozo",
  "proximo",
  "countdown",
  "flags",
  "top3",
];
const ALL: Key[] = [
  ...SECTIONS,
  "shadow",
  "gradient",
  "overflow",
  "flagshadow",
  "flaground",
  "bg",
  "glow",
];

function applyToggle(key: Key, isOff: boolean) {
  const heroes = () => document.querySelectorAll<HTMLElement>('[data-diag="hero"]');
  if (SECTIONS.includes(key)) {
    document
      .querySelectorAll<HTMLElement>(`[data-diag="${key}"]`)
      .forEach((el) => (el.style.display = isOff ? "none" : ""));
  } else if (key === "shadow") {
    heroes().forEach((el) => el.classList.toggle("ring-sticker", !isOff));
  } else if (key === "overflow") {
    heroes().forEach((el) => el.classList.toggle("overflow-hidden", !isOff));
  } else if (key === "gradient") {
    heroes().forEach((el) => {
      el.style.backgroundImage = isOff ? "none" : "";
      el.style.backgroundColor = isOff ? "#101019" : "";
    });
  } else if (key === "flagshadow") {
    document
      .querySelectorAll<HTMLElement>(".fi")
      .forEach((el) => (el.style.boxShadow = isOff ? "none" : ""));
  } else if (key === "flaground") {
    document
      .querySelectorAll<HTMLElement>(".fi")
      .forEach((el) => (el.style.borderRadius = isOff ? "0" : ""));
  } else if (key === "bg") {
    document.body.style.backgroundAttachment = isOff ? "scroll" : "";
  } else if (key === "glow") {
    document.body.style.backgroundImage = isOff ? "none" : "";
  }
}

export function DiagBar() {
  const [off, setOff] = useState<Set<Key>>(new Set());
  const [open, setOpen] = useState(true);

  function toggle(key: Key) {
    setOff((prev) => {
      const next = new Set(prev);
      const isOff = !next.has(key);
      if (isOff) next.add(key);
      else next.delete(key);
      applyToggle(key, isOff);
      return next;
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-3 rounded-full px-4 py-2 text-xs font-extrabold shadow-2xl"
        style={{ zIndex: 90, background: "#ff4d5e", color: "#000" }}
      >
        DIAG
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-3 bottom-24 rounded-2xl border border-white/20 shadow-2xl"
      style={{ zIndex: 90, background: "rgba(0,0,0,0.96)" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="text-[10px] font-bold leading-tight text-white/70">
          Apaga (rojo) y mira con qué se limpia el glitch.
        </span>
        <button
          onClick={() => setOpen(false)}
          className="shrink-0 rounded px-2 py-1 text-[10px] font-bold text-white"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          ocultar
        </button>
      </div>
      <div className="flex max-h-[40vh] flex-wrap gap-1.5 overflow-y-auto px-3 pb-3">
        {ALL.map((k) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className="rounded-lg px-3 py-2 text-xs font-bold"
            style={{
              background: off.has(k) ? "#ff4d5e" : "rgba(255,255,255,0.15)",
              color: off.has(k) ? "#000" : "#fff",
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
