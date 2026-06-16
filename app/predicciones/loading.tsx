export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="h-10 w-28 animate-pulse rounded-lg bg-white/8" />
        <div className="mt-1.5 h-4 w-44 animate-pulse rounded bg-white/5" />
      </div>
      <div className="mx-auto w-full max-w-md px-4 pb-4 pt-4">
        <div className="mb-2.5 h-12 animate-pulse rounded-xl bg-white/8" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-2.5 h-24 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
