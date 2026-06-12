/** Skeleton del detalle de partido: cabecera con equipos + lista de jugadores. */
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      {/* Cabecera: ronda + equipos + estado */}
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="mx-auto h-3 w-24 animate-pulse rounded bg-white/8" />
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="flex w-20 flex-col items-center gap-1.5">
            <div className="size-10 animate-pulse rounded-full bg-white/8" />
            <div className="h-4 w-12 animate-pulse rounded bg-white/8" />
          </div>
          <div className="h-9 w-14 animate-pulse rounded-lg bg-white/8" />
          <div className="flex w-20 flex-col items-center gap-1.5">
            <div className="size-10 animate-pulse rounded-full bg-white/8" />
            <div className="h-4 w-12 animate-pulse rounded bg-white/8" />
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <div className="h-6 w-28 animate-pulse rounded-full bg-white/8" />
        </div>
      </div>
      {/* Lista de predicciones/jugadores */}
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pb-4">
        <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="mb-2.5 h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
