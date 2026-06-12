import { cn } from "@/lib/utils";

/**
 * Bandera de selección como PNG self-hosted (rasterizados de flag-icons → /public/flags).
 *
 * Se usa PNG (no SVG), renderizado como <img>. ¿Por qué? Las GPUs Mali de gama baja
 * (ej. Galaxy A21s) corrompen el render al rasterizar un SVG (sea background-image O
 * <img>) dentro de un contenedor con scroll. Un PNG ya viene rasterizado → la GPU
 * solo lo copia, sin dibujar vectores. (Confirmado aislando con la barra de diagnóstico.)
 *
 * El tamaño se controla con la clase de texto del contenedor (text-2xl, text-sm…):
 * la bandera mide 1.333em × 1em, así que escala con el font-size.
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${code}.png`}
      alt=""
      aria-hidden
      className={cn(
        "inline-block h-[1em] w-[1.333em] shrink-0 rounded-2px object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.25)]",
        className,
      )}
    />
  );
}
