import { cn } from "@/lib/utils";
import type { Accent } from "./match-card";

const BG: Record<Accent, string> = {
  neon: "bg-neon text-black",
  magenta: "bg-magenta text-white",
  azure: "bg-azure text-white",
  tangerine: "bg-tangerine text-black",
  gold: "bg-gold text-black",
  grape: "bg-grape text-white",
};

/** Banner ancho estilo sticker arcade, como los títulos de sección del pack. */
export function SectionBanner({
  children,
  accent = "neon",
  right,
  className,
}: {
  children: React.ReactNode;
  accent?: Accent;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-4 py-2.5",
        BG[accent],
        className,
      )}
    >
      <h2 className="font-display text-xl leading-none sm:text-2xl">{children}</h2>
      {right && <div className="shrink-0 text-sm font-bold">{right}</div>}
    </div>
  );
}

/** Tarjeta de estadística grande (104 PARTIDOS, etc.). */
export function StatBlock({
  value,
  label,
  accent = "neon",
}: {
  value: string;
  label: string;
  accent?: Accent;
}) {
  const color: Record<Accent, string> = {
    neon: "text-neon",
    magenta: "text-magenta",
    azure: "text-azure",
    tangerine: "text-tangerine",
    gold: "text-gold",
    grape: "text-grape",
  };
  return (
    <div className="ring-sticker rounded-2xl border border-border bg-card px-4 py-4 text-center">
      <div className={cn("font-display tnum text-4xl leading-none", color[accent])}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
