"use client";

import { useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los logs (Vercel Functions / consola) para poder diagnosticar.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <HugeiconsIcon icon={Alert02Icon} size={40} strokeWidth={2} className="text-destructive" />
      <h1 className="font-display mt-3 text-3xl text-foreground">Algo salió mal</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {error.message || "Ocurrió un error inesperado. Intenta de nuevo."}
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="font-display rounded-xl bg-neon px-5 py-3 text-black"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl bg-white/8 px-5 py-3 font-bold text-muted-foreground"
        >
          Inicio
        </Link>
      </div>
    </div>
  );
}
