/** Skeleton del contenido del admin (las tabs viven en el layout y no flashean). */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-2">
      <div className="h-9 shrink-0 animate-pulse rounded-xl bg-white/8" />
      <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-2.5 h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}
