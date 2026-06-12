"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Share08Icon } from "@hugeicons/core-free-icons";

export function InviteButton() {
  function invite() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const text = encodeURIComponent(
      `⚽ ¡Únete a la Polla Mundial 2026!. ${url}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <button
      onClick={invite}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neon/30 bg-neon/10 px-4 py-3.5 font-bold text-neon"
    >
      <HugeiconsIcon icon={Share08Icon} size={18} strokeWidth={2} />
      Invitar amigos por WhatsApp
    </button>
  );
}
