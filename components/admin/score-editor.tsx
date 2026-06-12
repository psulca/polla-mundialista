"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, Tick02Icon, Cancel01Icon, EraserIcon } from "@hugeicons/core-free-icons";
import { setScore, resetScore } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Flag } from "@/components/brand/flag";
import { cn } from "@/lib/utils";

interface Team {
  code: string;
  flag: string;
}

export function ScoreEditor({
  id,
  home,
  away,
  homeScore,
  awayScore,
  isKnockout = false,
  advancer = null,
}: {
  id: number;
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
  isKnockout?: boolean;
  advancer?: "home" | "away" | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmSave, setConfirmSave] = useState<{ home: string; away: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [adv, setAdv] = useState<"home" | "away" | null>(advancer);
  const [homeVal, setHomeVal] = useState(homeScore?.toString() ?? "");
  const [awayVal, setAwayVal] = useState(awayScore?.toString() ?? "");
  const saveFormRef = useRef<HTMLFormElement>(null);
  const resetFormRef = useRef<HTMLFormElement>(null);

  // Empate de eliminatoria sin definir quién avanza → no se puede guardar.
  const isDraw = homeVal !== "" && awayVal !== "" && Number(homeVal) === Number(awayVal);
  const needsAdvancer = isKnockout && isDraw && !adv;
  const canSave = homeVal !== "" && awayVal !== "" && !needsAdvancer;

  const hasScore = homeScore != null && awayScore != null;
  const label = `${home.code} vs ${away.code}`;
  const inputClass =
    "tnum w-10 rounded-lg border border-border bg-black/30 py-1.5 text-center text-lg outline-none focus:border-gold";

  if (editing) {
    return (
      <>
        <form
          ref={saveFormRef}
          action={setScore}
          className="flex flex-col gap-2 rounded-xl border border-gold/50 bg-card px-3 py-2"
        >
          <input type="hidden" name="matchId" value={id} />
          <input type="hidden" name="advancer" value={adv ?? ""} />
          <div className="flex items-center gap-2">
            <span className="flex flex-1 items-center justify-end gap-1.5 text-right">
              <span className="font-display text-sm">{home.code}</span>
              <Flag code={home.flag} className="text-base" />
            </span>
            <input
              name="home"
              inputMode="numeric"
              maxLength={2}
              value={homeVal}
              onChange={(e) => setHomeVal(e.target.value.replace(/\D/g, ""))}
              autoFocus
              className={inputClass}
            />
            <span className="text-muted-foreground">:</span>
            <input
              name="away"
              inputMode="numeric"
              maxLength={2}
              value={awayVal}
              onChange={(e) => setAwayVal(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
            <span className="flex flex-1 items-center gap-1.5">
              <Flag code={away.flag} className="text-base" />
              <span className="font-display text-sm">{away.code}</span>
            </span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Cancelar"
              title="Cancelar"
              className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-muted-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Guardar marcador"
              title="Guardar marcador"
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return;
                setConfirmSave({ home: homeVal, away: awayVal });
              }}
              className="flex size-8 items-center justify-center rounded-lg bg-gold text-black transition-opacity disabled:opacity-40"
            >
              <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Eliminatorias: quién avanzó (solo importa si el marcador es empate). */}
          {isKnockout && (
            <div className="flex items-center gap-2 border-t border-border pt-2">
              <span className="text-[11px] text-muted-foreground">Avanza:</span>
              {(["home", "away"] as const).map((side) => {
                const on = adv === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setAdv(on ? null : side)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
                      on ? "bg-azure text-black" : "bg-white/8 text-muted-foreground",
                    )}
                  >
                    {side === "home" ? home.code : away.code}
                  </button>
                );
              })}
              <span
                className={cn(
                  "ml-auto text-[10px]",
                  needsAdvancer ? "font-bold text-gold" : "text-muted-foreground/70",
                )}
              >
                {needsAdvancer ? "Empate: marca quién avanza" : "solo si hay empate"}
              </span>
            </div>
          )}
        </form>

        <ConfirmDialog
          open={confirmSave != null}
          onOpenChange={(o) => !o && setConfirmSave(null)}
          title="Guardar marcador"
          description={
            confirmSave
              ? `Vas a guardar ${home.code} ${confirmSave.home}–${confirmSave.away} ${away.code}.`
              : undefined
          }
          confirmLabel="Guardar"
          onConfirm={() => {
            saveFormRef.current?.requestSubmit();
            setEditing(false);
          }}
        />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
      <span className="flex flex-1 items-center justify-end gap-1.5 text-right">
        <span className="font-display text-sm">{home.code}</span>
        <Flag code={home.flag} className="text-base" />
      </span>
      <span className="font-display tnum w-14 text-center text-xl">
        {hasScore ? (
          <>
            {homeScore} : {awayScore}
          </>
        ) : (
          <span className="text-muted-foreground/40">– : –</span>
        )}
      </span>
      <span className="flex flex-1 items-center gap-1.5">
        <Flag code={away.flag} className="text-base" />
        <span className="font-display text-sm">{away.code}</span>
      </span>
      {hasScore && (
        <>
          <form ref={resetFormRef} action={resetScore}>
            <input type="hidden" name="matchId" value={id} />
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              aria-label="Borrar el marcador cargado a mano"
              title="Borrar el marcador cargado a mano"
              className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-muted-foreground"
            >
              <HugeiconsIcon icon={EraserIcon} size={15} strokeWidth={2} />
            </button>
          </form>
          <ConfirmDialog
            open={confirmReset}
            onOpenChange={setConfirmReset}
            title="Borrar marcador"
            description={`Se borra el marcador de ${label} que cargaste a mano y vuelve a quedar vacío.`}
            confirmLabel="Borrar"
            tone="danger"
            onConfirm={() => resetFormRef.current?.requestSubmit()}
          />
        </>
      )}
      <button
        onClick={() => setEditing(true)}
        aria-label="Editar marcador"
        title="Editar marcador"
        className="flex size-8 items-center justify-center rounded-lg bg-gold text-black"
      >
        <HugeiconsIcon icon={Edit02Icon} size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}
