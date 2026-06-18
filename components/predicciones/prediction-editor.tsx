"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Edit02Icon,
  SquareLock02Icon,
  CheckmarkBadge01Icon,
} from "@hugeicons/core-free-icons";
import { ScoreStepper } from "@/components/brand/score-stepper";
import { Flag } from "@/components/brand/flag";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { savePredictions } from "@/app/predicciones/actions";
import { cn } from "@/lib/utils";

export interface PredMatchDTO {
  id: number;
  groupLetter: string | null;
  kickoff: string;
  locked: boolean;
  home: { code: string; flag: string };
  away: { code: string; flag: string };
  pred: { home: number; away: number } | null;
}

type Pred = { home: number | null; away: number | null };

function initialPreds(matches: PredMatchDTO[]): Record<number, Pred> {
  return Object.fromEntries(
    matches.map((m) => [m.id, m.pred ?? { home: null, away: null }]),
  );
}

export function PredictionEditor({
  matches,
  roundLabel,
  roundOpen,
}: {
  matches: PredMatchDTO[];
  roundLabel: string;
  /** Si la fecha NO está abierta, todo es solo lectura (sin botón Editar). */
  roundOpen: boolean;
}) {
  const hasAny = matches.some((m) => m.pred);
  // Fecha cerrada → siempre "view" (solo lectura). Abierta sin picks → arranca en edición.
  const [mode, setMode] = useState<"view" | "edit">(roundOpen && !hasAny ? "edit" : "view");
  const [preds, setPreds] = useState<Record<number, Pred>>(() =>
    initialPreds(matches),
  );
  const [error, setError] = useState("");
  const [toast, setToast] = useState(false); // montado (incluye la salida)
  const [toastIn, setToastIn] = useState(false); // en posición (controla la animación)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Muestra el toast: entra desde arriba, espera, y sale hacia arriba.
  function fireToast() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setToast(true);
    setToastIn(false);
    // Dos frames para que el navegador pinte el estado inicial (fuera) antes de animar.
    requestAnimationFrame(() => requestAnimationFrame(() => setToastIn(true)));
    timers.current.push(
      setTimeout(() => setToastIn(false), 2500), // dispara la salida
      setTimeout(() => setToast(false), 3100), // desmonta al terminar (600ms de transición)
    );
  }

  // Limpia timers si el componente se desmonta a mitad de animación.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const filled = matches.filter((m) => {
    const p = preds[m.id];
    return p && p.home != null && p.away != null;
  }).length;
  const dirty = JSON.stringify(preds) !== JSON.stringify(initialPreds(matches));

  // Editables (próximos) primero; cerrados al final. Vienen ordenados por kickoff.
  const open = matches.filter((m) => !m.locked);
  const closed = matches.filter((m) => m.locked);

  function change(matchId: number, side: "home" | "away", val: number) {
    setPreds((prev) => {
      const cur = prev[matchId] ?? { home: null, away: null };
      return {
        ...prev,
        [matchId]: {
          home: side === "home" ? val : (cur.home ?? 0),
          away: side === "away" ? val : (cur.away ?? 0),
        },
      };
    });
  }

  function cancel() {
    setPreds(initialPreds(matches));
    setError("");
    setMode("view");
  }

  function save() {
    setError("");
    const payload = matches
      .filter((m) => !m.locked)
      .map((m) => ({
        matchId: m.id,
        home: preds[m.id]?.home,
        away: preds[m.id]?.away,
      }))
      .filter(
        (x): x is { matchId: number; home: number; away: number } =>
          x.home != null && x.away != null,
      );
    startTransition(async () => {
      const res = await savePredictions(payload);
      if (res.ok) {
        setMode("view");
        fireToast();
      } else setError(res.error);
    });
  }

  function MatchRow({ m }: { m: PredMatchDTO }) {
    const p = preds[m.id] ?? { home: null, away: null };
    const editable = mode === "edit" && !m.locked;
    return (
      <div
        className={cn(
          "ring-sticker relative overflow-hidden rounded-2xl border border-border bg-card",
          m.locked && "opacity-55",
        )}
      >
        <div
          className={cn("h-1 w-full", m.locked ? "bg-white/15" : "bg-neon")}
        />
        <div className="flex items-center justify-between px-4 pt-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-azure">
            {m.kickoff}
          </span>
          {m.locked ? (
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <HugeiconsIcon
                icon={SquareLock02Icon}
                size={12}
                strokeWidth={2}
              />{" "}
              Cerrado
            </span>
          ) : (
            p.home != null &&
            p.away != null && (
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                size={15}
                strokeWidth={2}
                className="text-neon"
              />
            )
          )}
        </div>
        {/* < 376px: scoreboard — cada equipo en columna con su control debajo */}
        <div className="flex items-start gap-3 px-3 py-3.5 min-[450px]:hidden">
          <div className="flex flex-1 flex-col items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Flag code={m.home.flag} className="text-2xl" />
              <span className="font-display text-xl">{m.home.code}</span>
            </div>
            {editable ? (
              <ScoreStepper
                value={p.home}
                onChange={(v) => change(m.id, "home", v)}
              />
            ) : (
              <span
                className={cn(
                  "font-display tnum text-3xl leading-none",
                  p.home == null ? "text-muted-foreground/40" : "text-foreground",
                )}
              >
                {p.home ?? "–"}
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center gap-2.5">
            <div className="flex items-center gap-2">
              <Flag code={m.away.flag} className="text-2xl" />
              <span className="font-display text-xl">{m.away.code}</span>
            </div>
            {editable ? (
              <ScoreStepper
                value={p.away}
                onChange={(v) => change(m.id, "away", v)}
              />
            ) : (
              <span
                className={cn(
                  "font-display tnum text-3xl leading-none",
                  p.away == null ? "text-muted-foreground/40" : "text-foreground",
                )}
              >
                {p.away ?? "–"}
              </span>
            )}
          </div>
        </div>

        {/* ≥ 376px: layout original — fila única [equipo] [marcador] [equipo] */}
        <div className="hidden items-center gap-2 px-3 py-3 min-[450px]:flex">
          <div className="flex flex-1 items-center gap-2">
            <Flag code={m.home.flag} className="text-2xl" />
            <span className="font-display text-xl">{m.home.code}</span>
          </div>
          {editable ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <ScoreStepper
                value={p.home}
                onChange={(v) => change(m.id, "home", v)}
              />
              <span className="text-muted-foreground/50">:</span>
              <ScoreStepper
                value={p.away}
                onChange={(v) => change(m.id, "away", v)}
              />
            </div>
          ) : (
            <div className="font-display tnum flex shrink-0 items-center gap-2 text-3xl">
              <span className={p.home == null ? "text-muted-foreground/40" : "text-foreground"}>
                {p.home ?? "–"}
              </span>
              <span className="text-muted-foreground/40">:</span>
              <span className={p.away == null ? "text-muted-foreground/40" : "text-foreground"}>
                {p.away ?? "–"}
              </span>
            </div>
          )}
          <div className="flex flex-1 flex-row-reverse items-center gap-2">
            <Flag code={m.away.flag} className="text-2xl" />
            <span className="font-display text-xl">{m.away.code}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2.5">
      {toast && (
        <div
          className={cn(
            "fixed inset-x-0 top-20 z-60 mx-auto flex w-fit items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-bold text-black shadow-2xl transition-all duration-600 ease-out",
            toastIn ? "translate-y-0 opacity-100" : "-translate-y-8 opacity-0",
          )}
        >
          <HugeiconsIcon
            icon={CheckmarkBadge01Icon}
            size={18}
            strokeWidth={2.5}
          />
          Pronósticos guardados
        </div>
      )}
      {/* progreso — sticky para no perder de vista cuántos llevás al scrollear */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-xl border border-border bg-card/95 px-4 py-3 backdrop-blur-md">
        <span className="font-display text-xl">{roundLabel}</span>
        <span className="text-sm text-muted-foreground">
          <span className="font-display text-2xl text-neon">{filled}</span>
          <span className="tnum"> / {matches.length}</span> cargadas
        </span>
      </div>

      {open.map((m) => (
        <MatchRow key={m.id} m={m} />
      ))}

      {closed.length > 0 && (
        <>
          <div className="mt-2 flex items-center gap-3 px-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Ya cerrados
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {closed.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </>
      )}

      {/* Barra flotante */}
      {!roundOpen ? (
        <div className="sticky bottom-4 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-white/8 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon icon={SquareLock02Icon} size={13} strokeWidth={2} />
            Fecha cerrada · solo lectura
          </span>
        </div>
      ) : mode === "edit" ? (
        <div className="sticky bottom-3 mt-2 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-md">
          {error && (
            <p className="mb-2 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            {hasAny && (
              <button
                onClick={cancel}
                disabled={pending}
                className="rounded-xl bg-white/8 px-4 py-3.5 font-bold text-muted-foreground"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={pending || !dirty}
              className="font-display flex-1 rounded-xl bg-neon py-3.5 text-xl text-black transition-opacity disabled:opacity-40"
            >
              {pending
                ? "Guardando…"
                : dirty
                  ? "Guardar pronósticos"
                  : "Sin cambios"}
            </button>
          </div>
        </div>
      ) : (
        <div className="pointer-events-none sticky bottom-4 flex justify-end">
          <button
            onClick={() => setMode("edit")}
            className="font-display pointer-events-auto flex items-center gap-2 rounded-full bg-neon px-5 py-3 text-lg text-black shadow-2xl"
          >
            <HugeiconsIcon icon={Edit02Icon} size={18} strokeWidth={2.5} />{" "}
            Editar
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Guardar pronósticos"
        description={`Vas a guardar tus marcadores de ${roundLabel} (${filled} de ${matches.length}). Podrás editarlos mientras la fecha siga abierta.`}
        confirmLabel="Guardar"
        onConfirm={save}
      />
    </div>
  );
}
