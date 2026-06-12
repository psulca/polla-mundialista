import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * Cáscara de pantalla mobile: el `header` queda FIJO (título, pastillas,
 * contador) y solo la lista/contenido scrollea, con barra estilada.
 */
export function Screen({
  header,
  children,
  contentClassName,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      {header ? (
        <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
          {header}
        </div>
      ) : null}
      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "mx-auto w-full max-w-md px-4 pb-4 pt-4",
            contentClassName,
          )}
        >
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}
