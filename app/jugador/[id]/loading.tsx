/** Skeleton del perfil de jugador: nombre + tarjetas de pronósticos. */
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-white/8" />
        <div className="mt-2 h-3 w-64 animate-pulse rounded bg-white/8" />
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2.5 overflow-hidden px-4 pb-4 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 shrink-0 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
