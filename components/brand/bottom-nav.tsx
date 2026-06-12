"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Home01Icon,
  Target02Icon,
  Tv01Icon,
  ChampionIcon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Inicio", icon: Home01Icon },
  { href: "/predicciones", label: "Predecir", icon: Target02Icon },
  { href: "/visor", label: "Visor", icon: Tv01Icon },
  { href: "/ranking", label: "Ranking", icon: ChampionIcon },
];

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: Settings01Icon };

export function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const path = usePathname();
  // En /login la barra se mantiene: si entraste sin querer (ej. tocaste "Predecir"
  // sin estar logueado), tenés que poder volver a Inicio/Visor/Ranking sin loguearte.
  const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;

  return (
    <nav className="shrink-0 border-t border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
                active ? "text-neon" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={it.icon} size={22} strokeWidth={2} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
