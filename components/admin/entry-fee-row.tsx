"use client";

import { useState, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { setEntryFee } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

/**
 * Fila editable del precio de inscripción de una fecha. El botón "Guardar" solo se
 * activa cuando el valor CAMBIÓ (dirty); muestra "Guardando…" mientras procesa y
 * "Guardado" al terminar. Input controlado solo-dígitos → sin spinners nativos.
 */
export function EntryFeeRow({
  roundId,
  label,
  saved,
}: {
  roundId: number;
  label: string;
  saved: number;
}) {
  const [value, setValue] = useState(String(saved));
  const [justSaved, setJustSaved] = useState(false);
  const [pending, start] = useTransition();

  const num = value.trim() === "" ? null : Number(value);
  const dirty = num != null && num !== saved;

  function save() {
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("roundId", String(roundId));
    fd.set("fee", String(num));
    start(async () => {
      await setEntryFee(fd);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    });
  }

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0">
      <span className="flex-1 truncate text-sm font-bold">{label}</span>
      <span className="text-sm text-muted-foreground">S/</span>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, ""));
          setJustSaved(false);
        }}
        inputMode="numeric"
        maxLength={5}
        aria-label={`Precio de ${label}`}
        className="tnum w-16 rounded-lg border border-border bg-black/30 px-2 py-1 text-center text-sm outline-none focus:border-gold"
      />
      <button
        type="button"
        onClick={save}
        disabled={!dirty || pending}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase transition-colors",
          justSaved
            ? "bg-neon/20 text-neon"
            : dirty
              ? "bg-gold text-black"
              : "cursor-default bg-white/8 text-muted-foreground",
        )}
      >
        {pending ? (
          "Guardando…"
        ) : justSaved ? (
          <>
            <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
            Guardado
          </>
        ) : (
          "Guardar"
        )}
      </button>
    </div>
  );
}
