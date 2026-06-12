"use client";

import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FootballIcon } from "@hugeicons/core-free-icons";
import { Flag } from "@/components/brand/flag";
import { loginOrRegister, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginOrRegister,
    undefined,
  );
  const needsName = state?.needsName ?? false;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Polla Mundialista"
          width={96}
          height={96}
          className="mb-4 size-24"
        />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white">
          <HugeiconsIcon icon={FootballIcon} size={13} strokeWidth={2.5} />{" "}
          Mundial 2026
        </span>
        <h1 className="font-display mt-3 text-6xl leading-[0.85] text-foreground">
          Polla <span className="text-neon">Mundial</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {needsName
            ? "¡Bienvenido! Elige un nombre para registrarte."
            : "Entra con tu teléfono y tu PIN."}
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        {needsName ? (
          // Paso 2: SOLO el nombre. El teléfono y el PIN viajan ocultos.
          <>
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Registrando{" "}
              <span className="tnum inline-flex items-center gap-1.5 font-bold text-foreground">
                <Flag code="pe" className="text-sm" /> +51 {state?.phone}
              </span>
            </div>
            <input type="hidden" name="phone" value={state?.phone ?? ""} />
            <input type="hidden" name="pin" value={state?.pin ?? ""} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tu nombre
              </span>
              <input
                name="name"
                autoFocus
                autoComplete="off"
                placeholder="Carlos"
                className="rounded-xl border border-border bg-card px-4 py-3.5 text-lg text-foreground outline-none focus:border-neon"
              />
            </label>
          </>
        ) : (
          // Paso 1: teléfono + PIN.
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Teléfono
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 focus-within:border-neon">
                <span className="flex shrink-0 items-center gap-1.5 text-lg text-muted-foreground">
                  <Flag code="pe" className="text-base" /> +51
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  autoComplete="tel"
                  defaultValue={state?.phone ?? ""}
                  placeholder="987654321"
                  className="tnum w-full bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                PIN (6 dígitos)
              </span>
              <input
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                defaultValue={state?.pin ?? ""}
                placeholder="••••••"
                className="tnum rounded-xl border border-border bg-card px-4 py-3.5 text-2xl tracking-[0.4em] text-foreground outline-none focus:border-neon"
              />
            </label>
          </>
        )}

        {state?.error && (
          <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="font-display mt-2 rounded-xl bg-neon py-4 text-2xl text-black transition-opacity disabled:opacity-50"
        >
          {pending ? "Entrando…" : needsName ? "Crear cuenta" : "Continuar"}
        </button>
      </form>

      <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
        El acceso lo aprueba el admin
      </p>
    </main>
  );
}
