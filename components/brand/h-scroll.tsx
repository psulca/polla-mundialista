"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Scroll horizontal con barra fina estilada (no la nativa fea).
 * El viewport lleva padding inferior para que la barra quede DEBAJO del
 * contenido y no se superponga a las pastillas.
 *
 * Desktop UX: la rueda vertical del mouse se convierte en scroll horizontal
 * (mobile usa el dedo y no dispara 'wheel', así que no se ve afectado). En los
 * extremos no bloqueamos la página: dejamos que siga el scroll normal.
 */
export function HScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      // Trackpad horizontal (deltaX) ya funciona nativo → solo tocamos la rueda vertical.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el!.scrollWidth - el!.clientWidth;
      if (max <= 0) return; // sin overflow → no hay nada que mover
      const atStart = e.deltaY < 0 && el!.scrollLeft <= 0;
      const atEnd = e.deltaY > 0 && el!.scrollLeft >= max - 1;
      if (atStart || atEnd) return; // en el borde → dejar scrollear la página
      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <ScrollArea.Root className={cn("relative", className)}>
      <ScrollArea.Viewport ref={viewportRef} className="w-full pb-3">
        {children}
      </ScrollArea.Viewport>
      {/* Barra un poco más gruesa y visible al pasar el mouse (desktop). */}
      <ScrollArea.Scrollbar
        orientation="horizontal"
        className="absolute inset-x-0 bottom-0 flex h-1 touch-none select-none flex-col rounded-full opacity-60 transition-[height,opacity] hover:h-2 hover:opacity-100"
      >
        <ScrollArea.Thumb className="flex-1 rounded-full bg-border" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
