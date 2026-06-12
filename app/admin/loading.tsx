/** Skeleton del admin: pestañas + secciones. */
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-5">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-white/8" />
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-2">
        <div className="h-9 shrink-0 animate-pulse rounded-xl bg-white/8" />
        <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-2.5 h-12 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
