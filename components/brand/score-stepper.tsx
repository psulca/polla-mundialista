"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function ScoreStepper({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const v = value ?? 0;
  const btn =
    "flex size-8 items-center justify-center rounded-lg bg-white/8 text-foreground transition-colors hover:bg-white/16 disabled:opacity-30 disabled:hover:bg-white/8";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="menos"
        disabled={disabled || v <= 0}
        onClick={() => onChange(Math.max(0, v - 1))}
        className={btn}
      >
        <HugeiconsIcon icon={MinusSignIcon} size={16} strokeWidth={2.5} />
      </button>
      <span
        className={cn(
          "font-display tnum w-7 text-center text-3xl leading-none",
          value == null ? "text-muted-foreground/40" : "text-foreground",
        )}
      >
        {value ?? "–"}
      </span>
      <button
        type="button"
        aria-label="más"
        disabled={disabled || v >= 99}
        onClick={() => onChange(v + 1)}
        className={btn}
      >
        <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
