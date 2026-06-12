"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchTeam {
  label: string;
  matchId: number;
  /** Texto buscable (nombre inglés + español + código). Se normaliza al filtrar. */
  keywords: string;
}

const MAX_RESULTS = 8;

/** Minúsculas y sin tildes, para que "espana" matchee "España". */
function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function TeamSearch({ teams }: { teams: SearchTeam[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = norm(q.trim());
    if (!term) return [];
    return teams.filter((t) => norm(t.keywords).includes(term)).slice(0, MAX_RESULTS);
  }, [q, teams]);

  // Cerrar el dropdown al clickear afuera.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function go(t: SearchTeam) {
    document
      .getElementById(`match-${t.matchId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setQ("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <HugeiconsIcon
        icon={Search01Icon}
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => q.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Buscar selección…"
        aria-label="Buscar selección"
        className="h-10 rounded-full pl-9 pr-9"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
          aria-label="Limpiar"
          className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2.5} />
        </button>
      )}

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</div>
          ) : (
            results.map((t, i) => (
              <button
                key={`${t.matchId}-${t.label}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(t)}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-sm transition last:border-b-0",
                  i === active ? "bg-white/8 text-foreground" : "text-muted-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground"
                />
                <span className="truncate">{t.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
