export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-4 pt-7">
      {/* Badge + título */}
      <div className="h-6 w-28 animate-pulse rounded-full bg-white/8" />
      <div className="mt-2 h-14 w-52 animate-pulse rounded-lg bg-white/8" />
      <div className="mt-3 h-4 w-36 animate-pulse rounded bg-white/5" />

      {/* Hero: fecha activa */}
      <div className="mt-6 h-36 animate-pulse rounded-3xl border border-border bg-card" />

      {/* Grid: pozo + próximo */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
      </div>

      {/* Top 3 */}
      <div className="mt-6">
        <div className="mb-2 h-6 w-16 animate-pulse rounded bg-white/8" />
        <div className="ring-sticker overflow-hidden rounded-2xl border border-border bg-card">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <div className="size-7 shrink-0 animate-pulse rounded-lg bg-white/8" />
              <div className="h-4 flex-1 animate-pulse rounded bg-white/5" />
              <div className="h-7 w-8 animate-pulse rounded bg-white/8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
