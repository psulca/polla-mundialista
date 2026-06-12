"use client";

import { useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Botón que pide confirmación (diálogo de shadcn) antes de enviar un server action.
 * Reutilizable para las acciones de peso del admin (abrir/cerrar fecha, modo, etc.).
 */
export function ConfirmSubmit({
  action,
  fields,
  className,
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "default",
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  className?: string;
  children: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action}>
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={className}
        >
          {children}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        tone={tone}
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
