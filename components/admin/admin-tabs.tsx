"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "jugadores", label: "Jugadores" },
  { key: "fechas", label: "Fechas" },
  { key: "marcadores", label: "Marcadores" },
] as const;

export function AdminTabs() {
  const searchParams = useSearchParams();
  const t = searchParams.get("t") ?? "jugadores";
  const tab = TABS.some((x) => x.key === t) ? t : "jugadores";

  return (
    <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-5">
      <nav className="grid grid-cols-3 gap-2">
        {TABS.map((x) => (
          <Link
            key={x.key}
            href={`/admin?t=${x.key}`}
            className={cn(
              "rounded-xl py-2.5 text-center text-sm font-bold uppercase tracking-wide transition-colors",
              x.key === tab
                ? "bg-neon text-black"
                : "bg-white/8 text-muted-foreground hover:bg-white/12",
            )}
          >
            {x.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
