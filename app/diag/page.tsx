"use client";

import { useEffect, useState } from "react";

/**
 * Diagnóstico INTERACTIVO del bug de render (GPU Mali / A21s).
 * Deja ver el fondo real del body (background-attachment: fixed) y da toggles
 * para apagar sospechosos EN VIVO mientras se scrollea. El usuario ve cuál
 * toggle hace desaparecer la corrupción → esa es la causa.
 */

function Ticker() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-2xl font-bold text-[#00e676]">{String(n).padStart(5, "0")}</span>;
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-xs font-bold"
      style={{
        background: on ? "#00e676" : "rgba(255,255,255,0.12)",
        color: on ? "#000" : "#fff",
      }}
    >
      {label}: {on ? "ON" : "OFF"}
    </button>
  );
}

export default function DiagPage() {
  const [fixed, setFixed] = useState(true); // background-attachment del body
  const [glow, setGlow] = useState(true); // los radiales del body
  const [cover, setCover] = useState(false); // tapar el body con un opaco

  // Toca el fondo REAL del body en vivo.
  useEffect(() => {
    document.body.style.backgroundAttachment = fixed ? "fixed" : "scroll";
    return () => {
      document.body.style.backgroundAttachment = "";
    };
  }, [fixed]);

  useEffect(() => {
    document.body.style.backgroundImage = glow ? "" : "none";
    return () => {
      document.body.style.backgroundImage = "";
    };
  }, [glow]);

  return (
    // main TRANSPARENTE → se ve el fondo del body por detrás (como en el inicio real).
    <main className="h-full overflow-y-auto px-4 py-6">
      {/* Si "cover" está ON, este opaco tapa todo el fondo del body. */}
      {cover && <div className="fixed inset-0 z-0" style={{ background: "#07070a" }} />}

      <div className="relative z-10 mx-auto flex max-w-md flex-col gap-4">
        {/* Controles (pegados arriba) */}
        <div
          className="sticky top-0 z-20 flex flex-wrap gap-2 rounded-xl border border-white/20 p-3"
          style={{ background: "#000" }}
        >
          <p className="w-full text-xs font-bold text-white">
            Scrollea con cada combinación. Decime con cuál DEJA de romperse.
          </p>
          <Toggle on={fixed} label="Fondo FIXED" onClick={() => setFixed((v) => !v)} />
          <Toggle on={glow} label="Glow body" onClick={() => setGlow((v) => !v)} />
          <Toggle on={cover} label="Tapar fondo" onClick={() => setCover((v) => !v)} />
        </div>

        {/* Hero replica (con ticker que repinta) + relleno para poder scrollear */}
        <section
          style={{
            backgroundImage: "linear-gradient(to bottom, color-mix(in oklab, #00e676 12%, transparent), #101019)",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.06), 0 10px 30px -12px rgba(0,0,0,0.9)",
            border: "1px solid color-mix(in oklab, #00e676 30%, transparent)",
          }}
        >
          <div style={{ height: 6, background: "#00e676" }} />
          <div className="flex items-center justify-between p-5">
            <span className="font-display text-3xl text-white">FECHA 1</span>
            <Ticker />
          </div>
        </section>

        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl p-5"
            style={{
              background: "color-mix(in oklab, #ffcb05 10%, transparent)",
              border: "1px solid color-mix(in oklab, #ffcb05 30%, transparent)",
            }}
          >
            <span className="text-sm text-white/80">Tarjeta de relleno {i + 1}</span>
            <Ticker />
          </div>
        ))}

        <div className="h-24" />
      </div>
    </main>
  );
}
