import "flag-icons/css/flag-icons.min.css";
import { cn } from "@/lib/utils";

/**
 * Bandera de selección como SVG (flag-icons), auto-alojada — sin emoji.
 * Se ve idéntica en todo dispositivo, incluido Inglaterra/Escocia/Gales.
 *
 * El tamaño se controla con la clase de texto del contenedor (text-2xl, text-3xl…):
 * flag-icons dimensiona la bandera en `em`, así que escala con el font-size.
 */
export function Flag({
  code,
  className,
}: {
  code?: string | null;
  className?: string;
}) {
  // Placeholder neutro para cruces aún sin definir (ej. "2A" en eliminatorias).
  if (!code) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block aspect-4/3 w-[1.333em] rounded-2px bg-white/10",
          className,
        )}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "fi shrink-0 rounded-2px shadow-[0_0_0_1px_rgba(0,0,0,0.25)]",
        `fi-${code}`,
        className,
      )}
    />
  );
}
