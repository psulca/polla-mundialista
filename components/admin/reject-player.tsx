"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { rejectPlayer } from "@/app/admin/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Rechazar = borrar al jugador pendiente. Destructivo, así que confirma primero. */
export function RejectPlayer({ playerId, name }: { playerId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={rejectPlayer}>
        <input type="hidden" name="playerId" value={playerId} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Rechazar a ${name}`}
          title={`Rechazar a ${name}`}
          className="flex size-8 items-center justify-center rounded-lg bg-white/8 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
        </button>
      </form>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Rechazar jugador"
        description={`Se elimina la solicitud de ${name}. Tendrá que registrarse de nuevo.`}
        confirmLabel="Rechazar"
        tone="danger"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
