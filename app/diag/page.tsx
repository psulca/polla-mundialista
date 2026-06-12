"use client";

import { useEffect, useState } from "react";

/**
 * Página de DIAGNÓSTICO de render (GPU Mali / A21s).
 * Cada bloque aísla UN efecto CSS. El usuario mira cuáles se ven rotos
 * (banda de ruido / arcoíris) y reporta los números. No es parte de la app.
 *
 * Regla: #1 y el último (control sólido) DEBEN verse siempre limpios.
 * Si alguno de esos se rompe, el problema es más profundo (el navegador entero).
 */

// Contador que se actualiza 2x/seg → fuerza REPINTADO (como el <Countdown>).
function Ticker() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-3xl font-bold text-[#00e676]">
      {String(n).padStart(5, "0")}
    </span>
  );
}

function Block({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/15 bg-[#101019] p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-white/70">
        #{n} — {title}
      </div>
      {children}
    </section>
  );
}

const H = 128; // alto de cada caja de prueba
const SHADOW = "0 0 0 2px rgba(255,255,255,0.06), 0 10px 30px -12px rgba(0,0,0,0.9)";
const ALPHA_GRADIENT =
  "linear-gradient(to bottom, color-mix(in oklab, #00e676 12%, transparent), #101019)";
const BODY_RADIALS =
  "radial-gradient(40rem 30rem at 110% -10%, color-mix(in oklab, #ff2e88 18%, transparent), transparent)," +
  "radial-gradient(38rem 28rem at -10% 0%, color-mix(in oklab, #2f6bff 16%, transparent), transparent)," +
  "radial-gradient(35rem 30rem at 50% 120%, color-mix(in oklab, #00e676 12%, transparent), transparent)";

export default function DiagPage() {
  return (
    // Fondo sólido opaco: tapa el fondo global del body para no confundir.
    <main className="min-h-screen bg-[#07070a] px-4 py-6">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="rounded-xl border border-[#00e676]/40 bg-[#00e676]/10 p-3 text-sm text-white">
          <p className="font-bold">Diagnóstico de render</p>
          <p className="mt-1 text-white/80">
            Desliza despacio hasta el final. Anota qué números (#) se ven rotos /
            con ruido. El #1 y el #11 deben verse SIEMPRE limpios.
          </p>
        </div>

        {/* 1 — CONTROL: color plano. Debe verse siempre bien. */}
        <Block n={1} title="Control — color sólido">
          <div style={{ height: H, background: "#101019", borderRadius: 12 }} />
        </Block>

        {/* 2 — Degradado lineal con alpha (color-mix) = el del hero */}
        <Block n={2} title="Degradado lineal + alpha (color-mix)">
          <div style={{ height: H, backgroundImage: ALPHA_GRADIENT, borderRadius: 12 }} />
        </Block>

        {/* 3 — Radiales + background-attachment: fixed = el fondo del body */}
        <Block n={3} title="Radiales + background-attachment: fixed (desliza)">
          <div
            style={{
              height: H * 2,
              backgroundImage: BODY_RADIALS,
              backgroundAttachment: "fixed",
              borderRadius: 12,
            }}
          />
        </Block>

        {/* 4 — Box-shadow grande, estático */}
        <Block n={4} title="Box-shadow grande (estático)">
          <div style={{ height: H, background: "#101019", borderRadius: 16, boxShadow: SHADOW }} />
        </Block>

        {/* 5 — Box-shadow + contenido que se repinta cada 0.5s */}
        <Block n={5} title="Box-shadow + repintado (ticker)">
          <div
            style={{ height: H, background: "#101019", borderRadius: 16, boxShadow: SHADOW }}
            className="flex items-center justify-center"
          >
            <Ticker />
          </div>
        </Block>

        {/* 6 — overflow-hidden + rounded grande + repintado */}
        <Block n={6} title="overflow-hidden + rounded + repintado">
          <div
            style={{
              height: H,
              background: "#101019",
              borderRadius: 32,
              overflow: "hidden",
              position: "relative",
            }}
            className="flex items-center justify-center"
          >
            <div
              style={{ height: 6, width: "100%", background: "#00e676", position: "absolute", top: 0, left: 0 }}
            />
            <Ticker />
          </div>
        </Block>

        {/* 7 — backdrop-filter: blur (lo usa el header) */}
        <Block n={7} title="backdrop-filter: blur">
          <div style={{ height: H, position: "relative", overflow: "hidden", borderRadius: 12 }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: BODY_RADIALS }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                background: "rgba(0,0,0,0.3)",
              }}
              className="flex items-center justify-center text-white"
            >
              backdrop-blur
            </div>
          </div>
        </Block>

        {/* 8 — color-mix como fondo translúcido (bg-gold/10, etc.) */}
        <Block n={8} title="color-mix bg translúcido (gold/10)">
          <div
            style={{
              height: H,
              background: "color-mix(in oklab, #ffcb05 10%, transparent)",
              border: "1px solid color-mix(in oklab, #ffcb05 30%, transparent)",
              borderRadius: 16,
            }}
          />
        </Block>

        {/* 9 — Animación CSS tipo "animate-ping" (el punto En vivo) */}
        <Block n={9} title="Animación CSS (ping)">
          <div style={{ height: H }} className="flex items-center justify-center">
            <span className="relative flex size-8">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff4d5e] opacity-75" />
              <span className="relative inline-flex size-8 rounded-full bg-[#ff4d5e]" />
            </span>
          </div>
        </Block>

        {/* 10 — HERO COMPLETO: todo combinado (debería reproducir el bug) */}
        <Block n={10} title="HERO completo (gradiente+shadow+overflow+repintado)">
          <div
            style={{
              backgroundImage: ALPHA_GRADIENT,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: SHADOW,
              border: "1px solid color-mix(in oklab, #00e676 30%, transparent)",
            }}
          >
            <div style={{ height: 6, width: "100%", background: "#00e676" }} />
            <div className="flex items-center justify-between p-5">
              <span className="font-display text-3xl text-white">FECHA 1</span>
              <Ticker />
            </div>
          </div>
        </Block>

        {/* 11 — CONTROL final */}
        <Block n={11} title="Control final — color sólido">
          <div style={{ height: H, background: "#101019", borderRadius: 12 }} />
        </Block>

        <div className="h-24" />
      </div>
    </main>
  );
}
