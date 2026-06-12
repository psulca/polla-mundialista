/** Skeleton del ranking: título + pastillas de fechas + tabla. */
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-white/8" />
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-white/8" />
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col px-4 pb-4">
        <div className="mb-3 h-8 shrink-0 animate-pulse rounded-xl bg-white/5" />
        <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="mb-2.5 h-11 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
