"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Location01Icon } from "@hugeicons/core-free-icons";

export function JumpToMe({ playerId }: { playerId: string }) {
  return (
    <button
      onClick={() =>
        document
          .getElementById(`rank-${playerId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-neon bg-neon/10 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide text-neon shadow-[0_0_12px_-4px] shadow-neon transition-colors hover:bg-neon hover:text-black active:scale-95"
    >
      <HugeiconsIcon icon={Location01Icon} size={14} strokeWidth={2.5} />
      Tu puesto
    </button>
  );
}
