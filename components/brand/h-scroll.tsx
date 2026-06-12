"use client";

import { ScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Scroll horizontal con barra fina estilada (no la nativa fea).
 * El viewport lleva padding inferior para que la barra quede DEBAJO del
 * contenido y no se superponga a las pastillas.
 */
export function HScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ScrollArea.Root className={cn("relative", className)}>
      <ScrollArea.Viewport className="w-full pb-3">{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="horizontal"
        className="absolute inset-x-0 bottom-0 flex h-1 touch-none select-none flex-col rounded-full opacity-70"
      >
        <ScrollArea.Thumb className="flex-1 rounded-full bg-border" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
