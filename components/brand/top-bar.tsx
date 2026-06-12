"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  SquareLockPasswordIcon,
  Logout01Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { logout } from "@/app/login/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function TopBar({ name, loggedIn }: { name?: string | null; loggedIn?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al clickear afuera.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (path === "/login") return null;
  // Las rutas del tab bar se alcanzan con la nav de abajo → no llevan botón "Atrás".
  // El "Atrás" solo aparece en sub-vistas (detalle de partido, perfil, reglas, PIN).
  const TAB_ROUTES = ["/", "/predicciones", "/visor", "/ranking", "/admin"];
  const isTabRoute = TAB_ROUTES.includes(path);
  const initial = (name?.trim()?.charAt(0) ?? "?").toUpperCase();

  return (
    <>
    <header className="relative z-50 shrink-0 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-3">
        {isTabRoute ? (
          <div className="size-10" aria-hidden />
        ) : (
          <button
            onClick={() => router.back()}
            aria-label="Atrás"
            className="flex size-10 items-center justify-center rounded-full bg-white/8 text-foreground transition hover:bg-white/15 active:scale-90"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={22} strokeWidth={2.5} />
          </button>
        )}

        {loggedIn ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Cuenta"
              className="font-display flex size-10 items-center justify-center rounded-full bg-neon text-lg text-black"
            >
              {initial}
            </button>
            {open && (
              <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
                  Conectado como <span className="font-bold text-foreground">{name}</span>
                </div>
                <Link
                  href="/reglas"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5"
                >
                  <HugeiconsIcon icon={HelpCircleIcon} size={16} strokeWidth={2} />
                  Reglas
                </Link>
                <Link
                  href="/cambiar-pin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm hover:bg-white/5"
                >
                  <HugeiconsIcon icon={SquareLockPasswordIcon} size={16} strokeWidth={2} />
                  Cambiar PIN
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setConfirmLogout(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-destructive hover:bg-white/5"
                >
                  <HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={2} />
                  Salir
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-neon px-4 py-1.5 text-xs font-extrabold uppercase text-black"
          >
            Entrar
          </Link>
        )}
      </div>
    </header>
    <ConfirmDialog
      open={confirmLogout}
      onOpenChange={setConfirmLogout}
      title="Cerrar sesión"
      description="Tendrás que entrar de nuevo con tu número y PIN."
      confirmLabel="Salir"
      tone="danger"
      onConfirm={() => logout()}
    />
    </>
  );
}
