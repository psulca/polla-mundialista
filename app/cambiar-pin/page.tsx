"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { changePin, type ChangePinState } from "./actions";

function PinField({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        type="password"
        inputMode="numeric"
        maxLength={6}
        placeholder="••••••"
        className="tnum rounded-xl border border-border bg-card px-4 py-3.5 text-2xl tracking-[0.4em] text-foreground outline-none focus:border-neon"
      />
    </label>
  );
}

export default function CambiarPinPage() {
  const [state, action, pending] = useActionState<ChangePinState, FormData>(
    changePin,
    undefined,
  );

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <h1 className="font-display text-4xl text-foreground">Cambiar PIN</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu PIN protege tus predicciones. Que no sea obvio.
      </p>

      <form action={action} className="mt-6 flex flex-col gap-4">
        <PinField name="current" label="PIN actual" />
        <PinField name="next" label="PIN nuevo (6 dígitos)" />

        {state?.error && (
          <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="flex items-center gap-1.5 rounded-lg bg-neon/15 px-3 py-2 text-sm font-bold text-neon">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} size={16} strokeWidth={2.5} />
            PIN actualizado
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="font-display mt-2 rounded-xl bg-neon py-4 text-2xl text-black transition-opacity disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </main>
  );
}
